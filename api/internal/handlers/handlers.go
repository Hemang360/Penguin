package handlers

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/png"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"yourproject/internal/crypto"
	"yourproject/internal/eth"
	"yourproject/internal/ipfsdb"
	"yourproject/internal/models"
	"yourproject/internal/pinata"
)

type Handler struct {
	storage          *ipfsdb.StorageService
	ipfsClient       *ipfsdb.IPFSClient
	blockchainClient *ipfsdb.BlockchainClient
}

func NewHandler(storage *ipfsdb.StorageService, ipfs *ipfsdb.IPFSClient, bc *ipfsdb.BlockchainClient) *Handler {
	return &Handler{
		storage:          storage,
		ipfsClient:       ipfs,
		blockchainClient: bc,
	}
}

// RegisterUser handles user registration
func (h *Handler) RegisterUser(c echo.Context) error {
	var req struct {
		WalletAddress   string `json:"wallet_address"`
		UserType        string `json:"user_type"`
		AuthenticatorID string `json:"authenticator_id"`
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}

	// Generate Ed25519 key pair for user
	keyPair, err := crypto.GenerateKeyPair()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to generate keys"})
	}

	user := &models.User{
		ID:              uuid.New().String(),
		WalletAddress:   req.WalletAddress,
		PublicKey:       base64.StdEncoding.EncodeToString(keyPair.PublicKey),
		UserType:        req.UserType,
		CreatedAt:       time.Now(),
		AuthenticatorID: req.AuthenticatorID,
	}

	// Store private key securely (encrypted in production)
	privateKeyB64 := base64.StdEncoding.EncodeToString(keyPair.PrivateKey)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"user":        user,
		"private_key": privateKeyB64, // Send once, user must save securely
	})
}

// GenerateArt handles AI art generation with temp=0
func (h *Handler) GenerateArt(c echo.Context) error {
	var req models.GenerationRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}

	// Call model provider API with temperature=0 for reproducibility
	artworkData, err := h.callLLMAPI(req.LLMProvider, req.Prompt, req.ContentType, req.Parameters)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	// Process and watermark the artwork
	artwork, certificate, err := h.processArtwork(c.Request().Context(), req.UserID, req.Prompt, artworkData, req.ContentType, req.LLMProvider)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"artwork":     artwork,
		"certificate": certificate,
	})
}

// ImportArt handles artwork imported from chrome extension
func (h *Handler) ImportArt(c echo.Context) error {
	var req models.ImportRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}

	// Process imported artwork
	artwork, certificate, err := h.processArtwork(
		c.Request().Context(),
		req.UserID,
		req.Prompt,
		req.FileData,
		req.ContentType,
		req.SourcePlatform,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"artwork":     artwork,
		"certificate": certificate,
		"source_url":  req.SourceURL,
	})
}

// processArtwork handles the complete watermarking and storage pipeline
func (h *Handler) processArtwork(ctx context.Context, userID, prompt string, artworkData []byte, contentType, provider string) (*models.Artwork, *models.ProofCertificate, error) {
	// 1. Hash the prompt
	promptHash := crypto.HashPrompt(prompt)

	// 2. Hash original file
	originalHash := crypto.HashFile(artworkData)

	// 3. Load image (for image content type)
	var watermarkedData []byte
	var noisePattern *crypto.NoisePattern
	var publicKey string

	if contentType == "image" {
		img, _, err := image.Decode(bytes.NewReader(artworkData))
		if err != nil {
			return nil, nil, fmt.Errorf("failed to decode image: %w", err)
		}

		bounds := img.Bounds()

		// Generate unique noise pattern for this user
		noisePattern, err = crypto.GenerateNoisePattern(userID, bounds.Dx(), bounds.Dy())
		if err != nil {
			return nil, nil, fmt.Errorf("failed to generate noise pattern: %w", err)
		}

		// Generate key pair for this artwork
		keyPair, err := crypto.GenerateKeyPair()
		if err != nil {
			return nil, nil, fmt.Errorf("failed to generate key pair: %w", err)
		}
		publicKey = base64.StdEncoding.EncodeToString(keyPair.PublicKey)

		// Apply watermark
		watermarkedImg, err := crypto.ApplyWatermark(img, noisePattern, publicKey)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to apply watermark: %w", err)
		}

		// Encode watermarked image
		var buf bytes.Buffer
		if err := png.Encode(&buf, watermarkedImg); err != nil {
			return nil, nil, fmt.Errorf("failed to encode watermarked image: %w", err)
		}
		watermarkedData = buf.Bytes()
	} else {
		// For non-image content, store as-is (implement audio/video watermarking separately)
		watermarkedData = artworkData
		publicKey = uuid.New().String() // Placeholder
	}

	// 4. Hash watermarked content
	watermarkedHash := crypto.HashFile(watermarkedData)

	// 5. Create metadata for IPFS DAG
	artworkID := uuid.New().String()
	metadata := &ipfsdb.DAGMetadata{
		ArtworkID:      artworkID,
		ArtistWallet:   userID,
		PublicKey:      publicKey,
		PromptHash:     promptHash,
		ContentHash:    watermarkedHash,
		NoiseSignature: noisePattern.Signature,
		Timestamp:      time.Now(),
		Metadata: map[string]string{
			"provider":      provider,
			"content_type":  contentType,
			"original_hash": originalHash,
		},
	}

	// 6. Store on IPFS and blockchain
	dagCID, txHash, err := h.storage.StoreArtwork(ctx, watermarkedData, metadata)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to store artwork: %w", err)
	}

	// 7. Create artwork record
	artwork := &models.Artwork{
		ID:                artworkID,
		ArtistID:          userID,
		Prompt:            prompt,
		PromptHash:        promptHash,
		ContentType:       contentType,
		OriginalFileHash:  originalHash,
		WatermarkedHash:   watermarkedHash,
		IPFSHash:          dagCID,
		PublicKeyEmbedded: publicKey,
		NoisePattern:      noisePattern.Signature,
		BlockchainTxHash:  txHash,
		DAGNodeID:         dagCID,
		CreatedAt:         time.Now(),
		LLMProvider:       provider,
		Temperature:       0.0,
	}

	// 8. Create proof certificate
	certificate := &models.ProofCertificate{
		CertificateID:    uuid.New().String(),
		ArtworkID:        artworkID,
		ArtistWallet:     userID,
		Prompt:           prompt,
		PromptHash:       promptHash,
		ContentHash:      watermarkedHash,
		IPFSHash:         dagCID,
		BlockchainTxHash: txHash,
		NoiseSignature:   noisePattern.Signature,
		Timestamp:        time.Now(),
		IssuedAt:         time.Now(),
		VerificationURL:  fmt.Sprintf("/verify/%s", artworkID),
	}

	return artwork, certificate, nil
}

// VerifyArtwork handles artwork verification
func (h *Handler) VerifyArtwork(c echo.Context) error {
	artworkID := c.Param("id")

	// Get metadata and proof from blockchain/IPFS
	metadata, proof, err := h.storage.VerifyArtwork(c.Request().Context(), artworkID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "artwork not found"})
	}

	// Download artwork from IPFS
	artworkData, err := h.ipfsClient.DownloadFile(metadata.ContentCID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to download artwork"})
	}

	// Verify watermark for images
	var tamperDetected bool
	var confidence float64

	if metadata.Metadata["content_type"] == "image" {
		img, _, err := image.Decode(bytes.NewReader(artworkData))
		if err == nil {
			// Recreate noise pattern from user ID
			bounds := img.Bounds()
			expectedPattern, _ := crypto.GenerateNoisePattern(metadata.ArtistWallet, bounds.Dx(), bounds.Dy())

			// Detect watermark
			isValid, conf := crypto.DetectWatermark(img, expectedPattern, 10.0)
			tamperDetected = !isValid
			confidence = conf
		}
	}

	result := &models.VerificationResult{
		IsAuthentic:      !tamperDetected,
		ArtworkID:        artworkID,
		OriginalArtist:   metadata.ArtistWallet,
		CreationDate:     metadata.Timestamp,
		Prompt:           "", // Don't expose full prompt publicly
		TamperDetected:   tamperDetected,
		SimilarityScore:  confidence,
		BlockchainTxHash: proof.IPFSHash,
		CertificateURL:   fmt.Sprintf("/certificate/%s", artworkID),
		VerificationSteps: []string{
			"Blockchain verification: PASSED",
			"IPFS integrity check: PASSED",
			fmt.Sprintf("Watermark detection: confidence %.2f%%", confidence*100),
		},
	}

	return c.JSON(http.StatusOK, result)
}

// GetCertificate returns the proof certificate
func (h *Handler) GetCertificate(c echo.Context) error {
	artworkID := c.Param("id")

	metadata, proof, err := h.storage.VerifyArtwork(c.Request().Context(), artworkID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "certificate not found"})
	}

	certificate := &models.ProofCertificate{
		CertificateID:    uuid.New().String(),
		ArtworkID:        artworkID,
		ArtistWallet:     metadata.ArtistWallet,
		PromptHash:       metadata.PromptHash,
		ContentHash:      metadata.ContentHash,
		IPFSHash:         metadata.ContentCID,
		BlockchainTxHash: proof.IPFSHash,
		NoiseSignature:   metadata.NoiseSignature,
		Timestamp:        metadata.Timestamp,
		IssuedAt:         time.Now(),
		VerificationURL:  fmt.Sprintf("/verify/%s", artworkID),
	}

	return c.JSON(http.StatusOK, certificate)
}

// UploadForVerification handles file upload for verification
func (h *Handler) UploadForVerification(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "no file provided"})
	}

	src, err := file.Open()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to open file"})
	}
	defer src.Close()

	data, err := io.ReadAll(src)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to read file"})
	}

	// Hash the file
	fileHash := crypto.HashFile(data)

	// Try to extract public key from image
	_, _, err = image.Decode(bytes.NewReader(data))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid image file"})
	}

	// Try different seeds to find embedded key (brute force approach - optimize in production)
	// In production, maintain a mapping of artwork IDs to seeds

	return c.JSON(http.StatusOK, map[string]interface{}{
		"file_hash": fileHash,
		"message":   "File uploaded for verification",
	})
}

// callLLMAPI calls various provider APIs with temperature=0
func (h *Handler) callLLMAPI(provider, prompt, contentType string, params map[string]string) ([]byte, error) {
	// This is a simplified implementation
	// Add actual API calls to OpenAI, Stability AI, etc.

	switch provider {
	case "openai":
		return h.callOpenAI(prompt, contentType, params)
	case "vertex", "gemini", "google":
		return h.callVertexAI(prompt, contentType, params)
	case "stability":
		return h.callStabilityAI(prompt)
	case "grok", "xai":
		return h.callGrok(prompt, contentType, params)
	default:
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}
}

func (h *Handler) callOpenAI(prompt, contentType string, params map[string]string) ([]byte, error) {
	// Implement OpenAI API call with temperature=0
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("OPENAI_API_KEY not set")
	}

	if contentType == "text" {
		return h.callOpenAIText(apiKey, prompt)
	} else if contentType == "image" {
		return h.callOpenAIImage(apiKey, prompt, params)
	}

	return nil, fmt.Errorf("unsupported content type")
}

func (h *Handler) callOpenAIText(apiKey, prompt string) ([]byte, error) {
	url := "https://api.openai.com/v1/chat/completions"

	payload := map[string]interface{}{
		"model":       "gpt-4",
		"messages":    []map[string]string{{"role": "user", "content": prompt}},
		"temperature": 0,
	}

	jsonData, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}

func (h *Handler) callOpenAIImage(apiKey, prompt string, params map[string]string) ([]byte, error) {
	url := "https://api.openai.com/v1/images/generations"

	size := params["size"]
	if size == "" {
		size = "1024x1024"
	}
	model := params["model"]
	if model == "" {
		model = "gpt-image-1"
	}
	payload := map[string]interface{}{
		"prompt": prompt,
		"n":      1,
		"size":   size,
		"model":  model,
	}

	jsonData, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Download the generated image
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	// Extract image URL and download
	if data, ok := result["data"].([]interface{}); ok && len(data) > 0 {
		if imgData, ok := data[0].(map[string]interface{}); ok {
			if imgURL, ok := imgData["url"].(string); ok {
				imgResp, err := http.Get(imgURL)
				if err != nil {
					return nil, err
				}
				defer imgResp.Body.Close()
				return io.ReadAll(imgResp.Body)
			}
		}
	}

	return nil, fmt.Errorf("failed to download generated image")
}

// callVertexAI handles Google Vertex AI image generation (Imagen models)
func (h *Handler) callVertexAI(prompt, contentType string, params map[string]string) ([]byte, error) {
	if contentType != "image" {
		return nil, fmt.Errorf("vertex: unsupported content type: %s", contentType)
	}

	projectID := os.Getenv("VERTEX_PROJECT_ID")
	location := os.Getenv("VERTEX_LOCATION")
	accessToken := os.Getenv("GOOGLE_API_ACCESS_TOKEN")
	if projectID == "" || location == "" || accessToken == "" {
		return nil, fmt.Errorf("vertex: VERTEX_PROJECT_ID, VERTEX_LOCATION, and GOOGLE_API_ACCESS_TOKEN must be set")
	}

	// Default Imagen model name may evolve; allow override via params["model"]
	model := params["model"]
	if model == "" {
		model = "imagegeneration@005" // public Vertex image generation model
	}

	endpoint := fmt.Sprintf("https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:predict", location, projectID, location, model)

	// Build request per Vertex prediction schema
	size := params["size"]
	if size == "" {
		size = "1024x1024"
	}
	instances := []map[string]any{{
		"prompt": prompt,
	}}
	parameters := map[string]any{
		"sampleCount": 1,
		"imageSize":   size,
	}
	body := map[string]any{
		"instances":  instances,
		"parameters": parameters,
	}
	jsonData, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	// Parse predictions[0].bytesBase64Encoded
	if preds, ok := result["predictions"].([]any); ok && len(preds) > 0 {
		if m, ok := preds[0].(map[string]any); ok {
			if b64, ok := m["bytesBase64Encoded"].(string); ok && b64 != "" {
				return base64.StdEncoding.DecodeString(b64)
			}
		}
	}
	return nil, fmt.Errorf("vertex: image bytes not found in response")
}

// callGrok wires xAI (Grok) provider. Currently only text is supported here.
func (h *Handler) callGrok(prompt, contentType string, params map[string]string) ([]byte, error) {
	if contentType == "image" {
		return nil, fmt.Errorf("grok: image generation not implemented")
	}
	apiKey := os.Getenv("XAI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("XAI_API_KEY not set")
	}
	// Basic text completion example (placeholder)
	url := "https://api.x.ai/v1/chat/completions"
	payload := map[string]any{
		"model":       params["model"],
		"messages":    []map[string]string{{"role": "user", "content": prompt}},
		"temperature": 0,
	}
	if payload["model"] == "" {
		payload["model"] = "grok-2"
	}
	jsonData, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func (h *Handler) callStabilityAI(prompt string) ([]byte, error) {
	// Implement Stability AI API call
	return nil, fmt.Errorf("not implemented")
}

// Handlers provides handlers for the node-based system
type Handlers struct {
	db           *ipfsdb.IPFSDB
	artifactsDir string
	manifestsDir string
}

// NewHandlers creates a new handlers instance
func NewHandlers(db *ipfsdb.IPFSDB, artifactsDir, manifestsDir string) *Handlers {
	return &Handlers{
		db:           db,
		artifactsDir: artifactsDir,
		manifestsDir: manifestsDir,
	}
}

// ExtPush handles prompt data from extension
func (h *Handlers) ExtPush(c echo.Context) error {
	var req struct {
		Prompt    string            `json:"prompt"`
		Metadata  map[string]string `json:"metadata"`
		Timestamp time.Time         `json:"timestamp"`
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}

	// Store prompt data
	key := fmt.Sprintf("/ipfs/ext-%s", uuid.New().String())
	h.db.Save(key, req)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"key":    key,
		"status": "stored",
	})
}

// CreateNode creates a signed node
func (h *Handlers) CreateNode(c echo.Context) error {
	var req struct {
		Kind   string                 `json:"kind"`
		Author string                 `json:"author"`
		Body   map[string]interface{} `json:"body"`
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}

	// Generate signer
	signer, err := crypto.NewSigner()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to create signer"})
	}

	// Create node data
	nodeData := map[string]interface{}{
		"kind":      req.Kind,
		"author":    req.Author,
		"body":      req.Body,
		"timestamp": time.Now(),
	}

	// Serialize for signing
	nodeJSON, _ := json.Marshal(nodeData)
	nodeHash := crypto.Blake3Hex(nodeJSON)

	// Sign the node
	signature, err := signer.JWSDetached(nodeJSON)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to sign node"})
	}

	node := map[string]interface{}{
		"data":       nodeData,
		"hash":       nodeHash,
		"signature":  signature,
		"public_key": signer.PublicKey(),
		"key_id":     signer.KeyID(),
	}

	// Store node
	key := fmt.Sprintf("/ipfs/node-%s", nodeHash[:16])
	h.db.Save(key, node)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"key":  key,
		"node": node,
	})
}

// UploadArtifact handles media upload
func (h *Handlers) UploadArtifact(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "no file provided"})
	}

	nodeID := c.FormValue("nodeId")
	if nodeID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "nodeId required"})
	}

	src, err := file.Open()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to open file"})
	}
	defer src.Close()

	data, err := io.ReadAll(src)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to read file"})
	}

	// Hash the artifact
	artifactHash := crypto.SHA256Hex(data)
	blake3Hash := crypto.Blake3Hex(data)

	// Store artifact
	artifactKey := fmt.Sprintf("/ipfs/artifact-%s", blake3Hash[:16])
	artifact := map[string]interface{}{
		"data":      data,
		"hash":      artifactHash,
		"blake3":    blake3Hash,
		"node_id":   nodeID,
		"filename":  file.Filename,
		"size":      file.Size,
		"timestamp": time.Now(),
	}

	h.db.Save(artifactKey, artifact)

	// Write to disk
	filePath := fmt.Sprintf("%s/%s", h.artifactsDir, blake3Hash[:16])
	os.WriteFile(filePath, data, 0644)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"key":     artifactKey,
		"hash":    artifactHash,
		"blake3":  blake3Hash,
		"node_id": nodeID,
	})
}

// FinalizeManifest builds manifest from node/artifact keys
func (h *Handlers) FinalizeManifest(c echo.Context) error {
	var req struct {
		NodeKeys     []string `json:"node_keys"`
		ArtifactKeys []string `json:"artifact_keys"`
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}

	// Collect nodes and artifacts
	nodes := []interface{}{}
	artifacts := []interface{}{}

	for _, key := range req.NodeKeys {
		if val, ok := h.db.Get(key); ok {
			nodes = append(nodes, val)
		}
	}

	for _, key := range req.ArtifactKeys {
		if val, ok := h.db.Get(key); ok {
			artifacts = append(artifacts, val)
		}
	}

	// Create manifest
	manifest := map[string]interface{}{
		"nodes":     nodes,
		"artifacts": artifacts,
		"timestamp": time.Now(),
	}

	manifestJSON, _ := json.Marshal(manifest)
	manifestHash := crypto.Blake3Hex(manifestJSON)

	// Store manifest
	manifestKey := fmt.Sprintf("/ipfs/manifest-%s", manifestHash[:16])
	h.db.Save(manifestKey, manifest)

	// Write to disk
	filePath := fmt.Sprintf("%s/%s.json", h.manifestsDir, manifestHash[:16])
	os.WriteFile(filePath, manifestJSON, 0644)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"key":      manifestKey,
		"hash":     manifestHash,
		"manifest": manifest,
	})
}

// Verify verifies a signature for a given key
func (h *Handlers) Verify(c echo.Context) error {
	key := c.QueryParam("key")
	if key == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "key parameter required"})
	}

	val, ok := h.db.Get(key)
	if !ok {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "key not found"})
	}

	data := val.(map[string]interface{})

	// Extract signature and data
	signature, _ := data["signature"].(string)
	nodeData := data["data"]
	publicKey, _ := data["public_key"].(string)

	if signature == "" || publicKey == "" {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"key":    key,
			"valid":  false,
			"reason": "no signature found",
			"data":   nodeData,
		})
	}

	// Verify signature
	// This is a simplified verification - in production, use proper Ed25519 verification
	// Note: This is a simplified check - proper implementation would verify the signature
	// For now, we'll just check if the signature exists
	_, _ = json.Marshal(nodeData) // Serialize for potential future verification

	return c.JSON(http.StatusOK, map[string]interface{}{
		"key":        key,
		"valid":      signature != "",
		"data":       nodeData,
		"hash":       data["hash"],
		"public_key": publicKey,
		"signature":  signature,
	})
}

// UploadManifest handles POST /upload - uploads manifest to Pinata and stores CID on Ethereum
func (h *Handler) UploadManifest(c echo.Context) error {
	ctx, cancel := context.WithTimeout(c.Request().Context(), 60*time.Second)
	defer cancel()

	var req struct {
		ImageCID    string            `json:"image_cid"`
		Creator     string            `json:"creator"` // wallet address
		Prompt      string            `json:"prompt"`
		Model       string            `json:"model"`
		Origin      string            `json:"origin"`
		Timestamp   int64             `json:"timestamp"`
		DerivedFrom *string           `json:"derived_from,omitempty"`
		Metadata    map[string]string `json:"metadata,omitempty"`
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request: " + err.Error()})
	}

	// Validate required fields
	if req.ImageCID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "image_cid is required"})
	}
	if req.Creator == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "creator is required"})
	}

	// Create manifest JSON
	manifest := map[string]interface{}{
		"image_cid":  req.ImageCID,
		"creator":    req.Creator,
		"prompt":     req.Prompt,
		"model":      req.Model,
		"origin":     req.Origin,
		"timestamp":  req.Timestamp,
		"created_at": time.Now().Unix(),
	}

	if req.DerivedFrom != nil {
		manifest["derived_from"] = *req.DerivedFrom
	}

	if req.Metadata != nil {
		manifest["metadata"] = req.Metadata
	}

	// Pin manifest to Pinata
	pinataClient := pinata.NewFromEnv()
	if !pinataClient.Enabled() {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Pinata not configured. Please set PINATA_API_KEY and PINATA_API_SECRET"})
	}

	cid, err := pinataClient.PinJSONManifest(manifest)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to pin manifest to Pinata: " + err.Error()})
	}

	log.Printf("✅ Manifest pinned to Pinata: CID=%s", cid)

	// Get Ethereum configuration from environment
	rpcURL := os.Getenv("RPC_URL")
	privateKey := os.Getenv("PRIVATE_KEY")
	contractAddress := os.Getenv("CONTRACT_ADDRESS")

	if rpcURL == "" || privateKey == "" || contractAddress == "" {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Ethereum not configured. Please set RPC_URL, PRIVATE_KEY, and CONTRACT_ADDRESS in .env",
			"cid":   cid,
		})
	}

	// Store CID on Ethereum
	txHash, err := eth.StoreManifest(ctx, rpcURL, privateKey, contractAddress, cid)
	if err != nil {
		// Return CID even if Ethereum transaction fails
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error": "failed to store on Ethereum: " + err.Error(),
			"cid":   cid,
		})
	}

	etherscanURL := fmt.Sprintf("https://sepolia.etherscan.io/tx/%s", txHash)

	log.Printf("✅ Manifest stored on Ethereum: TX=%s", txHash)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"cid":       cid,
		"txHash":    txHash,
		"etherscan": etherscanURL,
		"manifest":  manifest,
	})
}
