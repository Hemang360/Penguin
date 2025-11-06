// internal/pinata/client.go
package pinata

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"time"
)

// Client represents a Pinata API client
type Client struct {
	apiKey    string
	apiSecret string
	enabled   bool
}

// PinataMetadata represents metadata for Pinata uploads
type PinataMetadata struct {
	Name      string            `json:"name"`
	KeyValues map[string]string `json:"keyvalues,omitempty"`
}

// PinataOptions represents options for Pinata uploads
type PinataOptions struct {
	CidVersion int `json:"cidVersion,omitempty"`
}

// NewFromEnv creates a new Pinata client from environment variables
func NewFromEnv() *Client {
	apiKey := os.Getenv("PINATA_API_KEY")
	apiSecret := os.Getenv("PINATA_API_SECRET")

	return &Client{
		apiKey:    apiKey,
		apiSecret: apiSecret,
		enabled:   apiKey != "" && apiSecret != "",
	}
}

// New creates a new Pinata client with explicit credentials
func New(apiKey, apiSecret string) *Client {
	return &Client{
		apiKey:    apiKey,
		apiSecret: apiSecret,
		enabled:   apiKey != "" && apiSecret != "",
	}
}

// Enabled returns whether the client is properly configured
func (c *Client) Enabled() bool {
	return c.enabled
}

// UploadFile uploads a file to Pinata IPFS with metadata
// metadata parameter uses interface{} to avoid circular dependency with ipfsdb
func (c *Client) UploadFile(data []byte, metadata interface{}) (string, error) {
	if !c.enabled {
		return "", fmt.Errorf("pinata client not configured")
	}

	// Extract fields from metadata using JSON marshal/unmarshal approach
	var artworkID, artistWallet, promptHash, contentHash string
	var timestamp time.Time
	var metadataMap map[string]string

	// Convert metadata to JSON and back to extract fields
	jsonBytes, err := json.Marshal(metadata)
	if err != nil {
		return "", fmt.Errorf("failed to marshal metadata: %w", err)
	}

	var genericMetadata struct {
		ArtworkID    string            `json:"artwork_id"`
		ArtistWallet string            `json:"artist_wallet"`
		PromptHash   string            `json:"prompt_hash"`
		ContentHash  string            `json:"content_hash"`
		Timestamp    time.Time         `json:"timestamp"`
		Metadata     map[string]string `json:"metadata"`
	}

	if err := json.Unmarshal(jsonBytes, &genericMetadata); err != nil {
		return "", fmt.Errorf("failed to unmarshal metadata: %w", err)
	}

	artworkID = genericMetadata.ArtworkID
	artistWallet = genericMetadata.ArtistWallet
	promptHash = genericMetadata.PromptHash
	contentHash = genericMetadata.ContentHash
	timestamp = genericMetadata.Timestamp
	metadataMap = genericMetadata.Metadata

	url := "https://api.pinata.cloud/pinning/pinFileToIPFS"

	// Create multipart form
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Add file part
	fileName := fmt.Sprintf("artwork-%s.png", artworkID)
	if artworkID == "" {
		fileName = fmt.Sprintf("artwork-%d.png", time.Now().Unix())
	}

	part, err := writer.CreateFormFile("file", fileName)
	if err != nil {
		return "", fmt.Errorf("failed to create form file: %w", err)
	}
	if _, err := part.Write(data); err != nil {
		return "", fmt.Errorf("failed to write file data: %w", err)
	}

	// Create pinataMetadata with required "name" field
	pinataMetadata := PinataMetadata{
		Name: fileName,
		KeyValues: map[string]string{
			"artwork_id":   artworkID,
			"artist":       artistWallet,
			"prompt_hash":  promptHash,
			"content_hash": contentHash,
		},
	}

	// Add timestamp if available
	if !timestamp.IsZero() {
		pinataMetadata.KeyValues["timestamp"] = timestamp.Format(time.RFC3339)
	}

	// Add provider and content_type if available
	if metadataMap != nil {
		if provider, ok := metadataMap["provider"]; ok && provider != "" {
			pinataMetadata.KeyValues["provider"] = provider
		}
		if contentType, ok := metadataMap["content_type"]; ok && contentType != "" {
			pinataMetadata.KeyValues["content_type"] = contentType
		}
		if originalHash, ok := metadataMap["original_hash"]; ok && originalHash != "" {
			pinataMetadata.KeyValues["original_hash"] = originalHash
		}
	}

	// Add metadata to form
	metadataJSON, err := json.Marshal(pinataMetadata)
	if err != nil {
		return "", fmt.Errorf("failed to marshal metadata: %w", err)
	}

	metadataPart, err := writer.CreateFormField("pinataMetadata")
	if err != nil {
		return "", fmt.Errorf("failed to create metadata field: %w", err)
	}
	if _, err := metadataPart.Write(metadataJSON); err != nil {
		return "", fmt.Errorf("failed to write metadata: %w", err)
	}

	// Add pinataOptions
	pinataOptions := PinataOptions{
		CidVersion: 1,
	}
	optionsJSON, err := json.Marshal(pinataOptions)
	if err != nil {
		return "", fmt.Errorf("failed to marshal options: %w", err)
	}

	optionsPart, err := writer.CreateFormField("pinataOptions")
	if err != nil {
		return "", fmt.Errorf("failed to create options field: %w", err)
	}
	if _, err := optionsPart.Write(optionsJSON); err != nil {
		return "", fmt.Errorf("failed to write options: %w", err)
	}

	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close multipart writer: %w", err)
	}

	// Create request
	req, err := http.NewRequest("POST", url, body)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("pinata_api_key", c.apiKey)
	req.Header.Set("pinata_secret_api_key", c.apiSecret)

	// Execute request
	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("pinata request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("pinata upload failed (status %d): %s", resp.StatusCode, string(respBody))
	}

	// Parse response to get IPFS hash
	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	ipfsHash, ok := result["IpfsHash"].(string)
	if !ok {
		return "", fmt.Errorf("IpfsHash not found in response")
	}

	return ipfsHash, nil
}

// PinJSONManifest uploads JSON content to Pinata IPFS
func (c *Client) PinJSONManifest(manifest map[string]interface{}) (string, error) {
	if !c.enabled {
		return "", fmt.Errorf("pinata client not configured")
	}

	url := "https://api.pinata.cloud/pinning/pinJSONToIPFS"

	// Get a meaningful name from manifest if available
	manifestName := fmt.Sprintf("manifest-%d", time.Now().Unix())
	if imageCID, ok := manifest["image_cid"].(string); ok && imageCID != "" {
		manifestName = fmt.Sprintf("manifest-%s", imageCID[:8])
	}

	// Prepare request body with pinataMetadata
	requestBody := map[string]interface{}{
		"pinataContent": manifest,
		"pinataMetadata": map[string]interface{}{
			"name": manifestName,
			"keyvalues": map[string]string{
				"type":      "artwork_manifest",
				"timestamp": fmt.Sprintf("%d", time.Now().Unix()),
			},
		},
		"pinataOptions": map[string]interface{}{
			"cidVersion": 1,
		},
	}

	// Add creator to keyvalues if available
	if creator, ok := manifest["creator"].(string); ok && creator != "" {
		requestBody["pinataMetadata"].(map[string]interface{})["keyvalues"].(map[string]string)["creator"] = creator
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("pinata_api_key", c.apiKey)
	req.Header.Set("pinata_secret_api_key", c.apiSecret)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("pinata request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("pinata upload failed (status %d): %s", resp.StatusCode, string(respBody))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	ipfsHash, ok := result["IpfsHash"].(string)
	if !ok {
		return "", fmt.Errorf("IpfsHash not found in response")
	}

	return ipfsHash, nil
}

// UnpinFile removes a file from Pinata
func (c *Client) UnpinFile(ipfsHash string) error {
	if !c.enabled {
		return fmt.Errorf("pinata client not configured")
	}

	url := fmt.Sprintf("https://api.pinata.cloud/pinning/unpin/%s", ipfsHash)

	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("pinata_api_key", c.apiKey)
	req.Header.Set("pinata_secret_api_key", c.apiSecret)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("pinata request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("pinata unpin failed (status %d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// TestAuthentication tests the Pinata API credentials
func (c *Client) TestAuthentication() error {
	if !c.enabled {
		return fmt.Errorf("pinata client not configured")
	}

	url := "https://api.pinata.cloud/data/testAuthentication"

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("pinata_api_key", c.apiKey)
	req.Header.Set("pinata_secret_api_key", c.apiSecret)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("pinata request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("pinata authentication failed (status %d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}
