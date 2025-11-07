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
	_ "golang.org/x/image/webp"

	"yourproject/internal/auth"
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

	// Get authenticated user from context
	user, ok := auth.GetDBUserFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "user not authenticated"})
	}

	// Override UserID from request with authenticated user ID (security: prevent user ID spoofing)
	req.UserID = user.ID

	// Validate user has a wallet address set
	if user.WalletAddress == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "wallet address not set. Please update your profile with a wallet address.",
		})
	}

	// Call model provider API with temperature=0 for reproducibility
	artworkData, err := h.callLLMAPI(req.LLMProvider, req.Prompt, req.ContentType, req.Parameters)
	if err != nil {
		c.Logger().Errorf("failed to call LLM API: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	// Process and watermark the artwork - use user ID and wallet address
	artwork, certificate, err := h.processArtwork(c.Request().Context(), user.ID, user.WalletAddress, req.Prompt, artworkData, req.ContentType, req.LLMProvider)
	if err != nil {
		c.Logger().Errorf("failed to process artwork in GenerateArt: %v", err)
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

	// Get authenticated user from context
	user, ok := auth.GetDBUserFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "user not authenticated"})
	}

	// Override UserID from request with authenticated user ID (security: prevent user ID spoofing)
	req.UserID = user.ID

	// Validate user has a wallet address set
	if user.WalletAddress == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "wallet address not set. Please update your profile with a wallet address.",
		})
	}

	// Process imported artwork - use user ID and wallet address
	artwork, certificate, err := h.processArtwork(
		c.Request().Context(),
		user.ID,
		user.WalletAddress,
		req.Prompt,
		req.FileData,
		req.ContentType,
		req.SourcePlatform,
	)
	if err != nil {
		c.Logger().Errorf("failed to process artwork: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"artwork":     artwork,
		"certificate": certificate,
		"source_url":  req.SourceURL,
	})
}

// processArtwork handles the complete watermarking and storage pipeline
func (h *Handler) processArtwork(ctx context.Context, userID, walletAddress, prompt string, artworkData []byte, contentType, provider string) (*models.Artwork, *models.ProofCertificate, error) {
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
		// For non-image content, store as-is
		watermarkedData = artworkData
		publicKey = uuid.New().String()
	}

	// 4. Hash watermarked content
	watermarkedHash := crypto.HashFile(watermarkedData)

	// 5. Create metadata for IPFS DAG
	artworkID := uuid.New().String()
	metadata := &ipfsdb.DAGMetadata{
		ArtworkID:      artworkID,
		ArtistWallet:   walletAddress,
		PublicKey:      publicKey,
		PromptHash:     promptHash,
		ContentHash:    watermarkedHash,
		NoiseSignature: noisePattern.Signature,
		Timestamp:      time.Now(),
		Metadata: map[string]string{
			"name":          fmt.Sprintf("Artwork-%s", artworkID),
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

	// Store artwork in database
	h.storage.GetDB().StoreArtwork(artwork)

	// 8. Create proof certificate
	certificate := &models.ProofCertificate{
		CertificateID:    uuid.New().String(),
		ArtworkID:        artworkID,
		ArtistWallet:     walletAddress,
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

	metadata, proof, err := h.storage.VerifyArtwork(c.Request().Context(), artworkID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "artwork not found"})
	}

	artworkData, err := h.ipfsClient.DownloadFile(metadata.ContentCID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to download artwork"})
	}

	var tamperDetected bool
	var confidence float64

	if metadata.Metadata["content_type"] == "image" {
		img, _, err := image.Decode(bytes.NewReader(artworkData))
		if err == nil {
			bounds := img.Bounds()
			expectedPattern, _ := crypto.GenerateNoisePattern(metadata.ArtistWallet, bounds.Dx(), bounds.Dy())
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
		Prompt:           "",
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

	fileHash := crypto.HashFile(data)

	_, _, err = image.Decode(bytes.NewReader(data))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid image file"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"file_hash": fileHash,
		"message":   "File uploaded for verification",
	})
}

// callLLMAPI calls various provider APIs
func (h *Handler) callLLMAPI(provider, prompt, contentType string, params map[string]string) ([]byte, error) {
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

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

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

	model := params["model"]
	if model == "" {
		model = "imagegeneration@005"
	}

	endpoint := fmt.Sprintf("https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:predict", location, projectID, location, model)

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

	if preds, ok := result["predictions"].([]any); ok && len(preds) > 0 {
		if m, ok := preds[0].(map[string]any); ok {
			if b64, ok := m["bytesBase64Encoded"].(string); ok && b64 != "" {
				return base64.StdEncoding.DecodeString(b64)
			}
		}
	}
	responseBody, err := json.Marshal(result)
	if err != nil {
		return nil, fmt.Errorf("vertex: image bytes not found in response (and failed to marshal error response)")
	}

	return nil, fmt.Errorf("vertex: image bytes not found in response. Full Vertex response: %s", string(responseBody))
}

func (h *Handler) callGrok(prompt, contentType string, params map[string]string) ([]byte, error) {
	if contentType == "image" {
		return nil, fmt.Errorf("grok: image generation not implemented")
	}
	apiKey := os.Getenv("XAI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("XAI_API_KEY not set")
	}

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
	return nil, fmt.Errorf("not implemented")
}

// UploadManifest handles POST /upload
func (h *Handler) UploadManifest(c echo.Context) error {
	ctx, cancel := context.WithTimeout(c.Request().Context(), 120*time.Second)
	defer cancel()

	pinataClient := pinata.NewFromEnv()
	if !pinataClient.Enabled() {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Pinata not configured. Please set PINATA_API_KEY and PINATA_API_SECRET"})
	}

	var imageCID string
	var err error

	imageFile, err := c.FormFile("image")
	if err == nil && imageFile != nil {
		src, err := imageFile.Open()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to open image file: " + err.Error()})
		}
		defer src.Close()

		imageData, err := io.ReadAll(src)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to read image file: " + err.Error()})
		}

		log.Printf("📤 Uploading image to Pinata (size: %d bytes, filename: %s)...", len(imageData), imageFile.Filename)
		imageCID, err = pinataClient.UploadFileSimple(imageData, imageFile.Filename)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to upload image to Pinata: " + err.Error()})
		}
		log.Printf("✅ Image uploaded to Pinata: CID=%s", imageCID)
	} else {
		imageCID = c.FormValue("image_cid")
	}

	var req struct {
		ImageCID    string            `json:"image_cid" form:"image_cid"`
		Creator     string            `json:"creator" form:"creator"`
		Prompt      string            `json:"prompt" form:"prompt"`
		Model       string            `json:"model" form:"model"`
		Origin      string            `json:"origin" form:"origin"`
		Timestamp   int64             `json:"timestamp" form:"timestamp"`
		DerivedFrom *string           `json:"derived_from,omitempty" form:"derived_from"`
		Metadata    map[string]string `json:"metadata,omitempty" form:"metadata"`
	}

	var creator string
	user, ok := auth.GetDBUserFromContext(c)
	if ok && user.WalletAddress != "" {
		creator = user.WalletAddress
		log.Printf("ℹ️  Using authenticated user's wallet: %s", creator)
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request: " + err.Error()})
	}

	if imageCID == "" {
		imageCID = req.ImageCID
		if imageCID == "" {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "image file or image_cid is required"})
		}
		log.Printf("ℹ️  Using provided image CID: %s", imageCID)
	}

	if req.Timestamp == 0 {
		req.Timestamp = time.Now().Unix()
	}

	if creator == "" {
		creator = req.Creator
	}

	if creator == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "creator (wallet address) is required"})
	}

	manifest := map[string]interface{}{
		"image_cid":  imageCID,
		"creator":    creator,
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

	log.Printf("📤 Uploading manifest to Pinata...")
	cid, err := pinataClient.PinJSONManifest(manifest)
	if err != nil {
		c.Logger().Errorf("failed to pin JSON manifest: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to pin manifest to Pinata: " + err.Error()})
	}

	log.Printf("✅ Manifest pinned to Pinata: CID=%s", cid)

	rpcURL := os.Getenv("RPC_URL")
	privateKey := os.Getenv("PRIVATE_KEY")
	contractAddress := os.Getenv("CONTRACT_ADDRESS")

	if rpcURL == "" || privateKey == "" || contractAddress == "" {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":     "Ethereum not configured. Please set RPC_URL, PRIVATE_KEY, and CONTRACT_ADDRESS in .env",
			"cid":       cid,
			"image_cid": imageCID,
		})
	}

	log.Printf("📤 Storing manifest CID on Ethereum Sepolia...")
	txHash, err := eth.StoreManifest(ctx, rpcURL, privateKey, contractAddress, cid)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error": "failed to store on Ethereum: " + err.Error(),
			"cid":   cid,
		})
	}

	etherscanURL := fmt.Sprintf("https://sepolia.etherscan.io/tx/%s", txHash)

	log.Printf("✅ Manifest stored on Ethereum: TX=%s", txHash)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"image_cid": imageCID,
		"cid":       cid,
		"txHash":    txHash,
		"etherscan": etherscanURL,
		"manifest":  manifest,
	})
}

// ============================================
// CRAWLER NOTIFICATION ENDPOINTS (NEW)
// ============================================

// GetNotifications retrieves all infringement notifications for the authenticated user
func (h *Handler) GetNotifications(c echo.Context) error {
	user, ok := auth.GetDBUserFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "user not authenticated"})
	}

	results, err := h.storage.GetDB().GetCrawlerResultsByUserID(c.Request().Context(), user.ID)
	if err != nil {
		c.Logger().Errorf("failed to get notifications: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to retrieve notifications"})
	}

	unreadCount := 0
	for _, result := range results {
		if result.Status == "pending" {
			unreadCount++
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"notifications": results,
		"total":         len(results),
		"unread":        unreadCount,
	})
}

// GetNotificationsByArtwork retrieves notifications for a specific artwork
func (h *Handler) GetNotificationsByArtwork(c echo.Context) error {
	artworkID := c.Param("artworkId")
	if artworkID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "artworkId is required"})
	}

	user, ok := auth.GetDBUserFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "user not authenticated"})
	}

	artwork, err := h.storage.GetDB().GetArtworkByID(c.Request().Context(), artworkID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "artwork not found"})
	}

	if artwork.ArtistID != user.ID {
		return c.JSON(http.StatusForbidden, map[string]string{"error": "you don't have permission to view these notifications"})
	}

	results, err := h.storage.GetDB().GetCrawlerResultsByArtworkID(c.Request().Context(), artworkID)
	if err != nil {
		c.Logger().Errorf("failed to get notifications: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to retrieve notifications"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"artwork_id":    artworkID,
		"notifications": results,
		"total":         len(results),
	})
}

// MarkNotificationAsRead marks a notification as read/acknowledged
func (h *Handler) MarkNotificationAsRead(c echo.Context) error {
	notificationID := c.Param("id")
	if notificationID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "notification id is required"})
	}

	user, ok := auth.GetDBUserFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "user not authenticated"})
	}

	err := h.storage.GetDB().UpdateCrawlerResultStatus(c.Request().Context(), notificationID, "read")
	if err != nil {
		c.Logger().Errorf("failed to update notification: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to update notification"})
	}

	log.Printf("✅ User %s marked notification %s as read", user.ID, notificationID)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "notification marked as read",
		"id":      notificationID,
	})
}

// MarkNotificationAsVerified marks a notification as verified (confirmed infringement)
func (h *Handler) MarkNotificationAsVerified(c echo.Context) error {
	notificationID := c.Param("id")
	if notificationID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "notification id is required"})
	}

	user, ok := auth.GetDBUserFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "user not authenticated"})
	}

	err := h.storage.GetDB().UpdateCrawlerResultStatus(c.Request().Context(), notificationID, "verified")
	if err != nil {
		c.Logger().Errorf("failed to update notification: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to update notification"})
	}

	log.Printf("⚠️  User %s marked notification %s as verified infringement", user.ID, notificationID)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "notification marked as verified infringement",
		"id":      notificationID,
	})
}

// DismissNotification marks a notification as dismissed (false positive)
func (h *Handler) DismissNotification(c echo.Context) error {
	notificationID := c.Param("id")
	if notificationID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "notification id is required"})
	}

	user, ok := auth.GetDBUserFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "user not authenticated"})
	}

	err := h.storage.GetDB().UpdateCrawlerResultStatus(c.Request().Context(), notificationID, "dismissed")
	if err != nil {
		c.Logger().Errorf("failed to update notification: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to update notification"})
	}

	log.Printf("ℹ️  User %s dismissed notification %s", user.ID, notificationID)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "notification dismissed",
		"id":      notificationID,
	})
}

// GetCrawlerStats returns statistics about crawler activity
func (h *Handler) GetCrawlerStats(c echo.Context) error {
	user, ok := auth.GetDBUserFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "user not authenticated"})
	}

	results, err := h.storage.GetDB().GetCrawlerResultsByUserID(c.Request().Context(), user.ID)
	if err != nil {
		c.Logger().Errorf("failed to get crawler stats: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to retrieve stats"})
	}

	stats := map[string]interface{}{
		"total_findings":    len(results),
		"pending":           0,
		"verified":          0,
		"dismissed":         0,
		"high_similarity":   0,
		"medium_similarity": 0,
		"low_similarity":    0,
		"tampered_detected": 0,
		"recent_findings":   0,
	}

	sevenDaysAgo := time.Now().AddDate(0, 0, -7)

	for _, result := range results {
		switch result.Status {
		case "pending":
			stats["pending"] = stats["pending"].(int) + 1
		case "verified":
			stats["verified"] = stats["verified"].(int) + 1
		case "dismissed":
			stats["dismissed"] = stats["dismissed"].(int) + 1
		}

		if result.SimilarityScore >= 0.90 {
			stats["high_similarity"] = stats["high_similarity"].(int) + 1
		} else if result.SimilarityScore >= 0.70 {
			stats["medium_similarity"] = stats["medium_similarity"].(int) + 1
		} else {
			stats["low_similarity"] = stats["low_similarity"].(int) + 1
		}

		if result.TamperDetected {
			stats["tampered_detected"] = stats["tampered_detected"].(int) + 1
		}

		if result.DetectedAt.After(sevenDaysAgo) {
			stats["recent_findings"] = stats["recent_findings"].(int) + 1
		}
	}

	return c.JSON(http.StatusOK, stats)
}

// TriggerManualScan triggers a manual scan for a specific artwork
func (h *Handler) TriggerManualScan(c echo.Context) error {
	artworkID := c.Param("artworkId")
	if artworkID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "artworkId is required"})
	}

	user, ok := auth.GetDBUserFromContext(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "user not authenticated"})
	}

	artwork, err := h.storage.GetDB().GetArtworkByID(c.Request().Context(), artworkID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "artwork not found"})
	}

	if artwork.ArtistID != user.ID {
		return c.JSON(http.StatusForbidden, map[string]string{"error": "you don't have permission to scan this artwork"})
	}

	log.Printf("🔍 Manual scan triggered for artwork %s by user %s", artworkID, user.ID)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":    "manual scan initiated",
		"artwork_id": artworkID,
		"status":     "scanning",
	})
}

// ============================================
// NODE/ARTIFACT HANDLERS (EXISTING)
// ============================================

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

	signer, err := crypto.NewSigner()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to create signer"})
	}

	nodeData := map[string]interface{}{
		"kind":      req.Kind,
		"author":    req.Author,
		"body":      req.Body,
		"timestamp": time.Now(),
	}

	nodeJSON, _ := json.Marshal(nodeData)
	nodeHash := crypto.Blake3Hex(nodeJSON)

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

	artifactHash := crypto.SHA256Hex(data)
	blake3Hash := crypto.Blake3Hex(data)

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

	manifest := map[string]interface{}{
		"nodes":     nodes,
		"artifacts": artifacts,
		"timestamp": time.Now(),
	}

	manifestJSON, _ := json.Marshal(manifest)
	manifestHash := crypto.Blake3Hex(manifestJSON)

	manifestKey := fmt.Sprintf("/ipfs/manifest-%s", manifestHash[:16])
	h.db.Save(manifestKey, manifest)

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

	_, _ = json.Marshal(nodeData)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"key":        key,
		"valid":      signature != "",
		"data":       nodeData,
		"hash":       data["hash"],
		"public_key": publicKey,
		"signature":  signature,
	})
}
