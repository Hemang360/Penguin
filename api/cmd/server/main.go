package main

import (
	"bytes"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"yourproject/internal/auth"
	"yourproject/internal/handlers"
	"yourproject/internal/ipfsdb"
)

// startModelServer starts TorchServe in the background
func startModelServer() {
	// Get the project root directory (api directory is the working dir when running from Air)
	// Go up one level from api/ to project root
	wd, err := os.Getwd()
	if err != nil {
		log.Printf("⚠️  Could not get working directory: %v", err)
		return
	}

	// If we're in api/cmd/server, go up 3 levels. If in api/, go up 1 level
	projectRoot := wd
	if filepath.Base(wd) == "server" {
		projectRoot = filepath.Join(wd, "..", "..", "..")
	} else if filepath.Base(wd) == "api" {
		projectRoot = filepath.Join(wd, "..")
	}

	scriptPath := filepath.Join(projectRoot, "scripts", "start_model_server.sh")

	log.Println("🤖 Starting TorchServe model server...")

	cmd := exec.Command("bash", scriptPath)
	cmd.Dir = projectRoot
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	// Start in background
	if err := cmd.Start(); err != nil {
		log.Printf("⚠️  Failed to start TorchServe: %v", err)
		log.Println("   You may need to start it manually: bash scripts/start_model_server.sh")
		return
	}

	// Wait for TorchServe to be ready
	log.Println("⏳ Waiting for TorchServe to be ready...")
	torchServeURL := "http://127.0.0.1:8080/ping"
	maxRetries := 30

	for i := 0; i < maxRetries; i++ {
		resp, err := http.Get(torchServeURL)
		if err == nil && resp.StatusCode == 200 {
			log.Println("✅ TorchServe is ready at http://127.0.0.1:8080")
			return
		}
		time.Sleep(1 * time.Second)
	}

	log.Println("⚠️  TorchServe did not respond in time, but continuing anyway...")
	log.Println("   Model endpoint may not be available yet")
}

// proxyToTorchServe proxies requests to TorchServe model server
func proxyToTorchServe(c echo.Context) error {
	modelName := c.Param("model")
	if modelName == "" {
		modelName = "poar_detector" // default model
	}

	torchServeURL := "http://127.0.0.1:8080/predictions/" + modelName

	// Read request body
	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "failed to read request body"})
	}

	// Create request to TorchServe
	req, err := http.NewRequest("POST", torchServeURL, bytes.NewReader(body))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to create request"})
	}

	// Copy headers
	for key, values := range c.Request().Header {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}

	// Make request to TorchServe
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"error":   "TorchServe model server is not available",
			"details": err.Error(),
		})
	}
	defer resp.Body.Close()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to read response"})
	}

	// Return response with same status code
	return c.Blob(resp.StatusCode, resp.Header.Get("Content-Type"), respBody)
}

func main() {
	// Load .env file automatically (if present)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	} else {
		log.Println(".env file loaded successfully")
	}

	// Start TorchServe model server
	startModelServer()

	// Debug check: confirm env variables are loaded
	log.Printf("🔍 Vertex Project: %s | Location: %s | Token length: %d\n",
		os.Getenv("VERTEX_PROJECT_ID"),
		os.Getenv("VERTEX_LOCATION"),
		len(os.Getenv("GOOGLE_API_ACCESS_TOKEN")),
	)

	e := echo.New()
	e.HideBanner = false
	e.Pre(middleware.RemoveTrailingSlash())
	e.Use(middleware.Recover())
	e.Use(middleware.Logger())
	e.Use(middleware.CORS())

	// Initialize mocked IPFS DB
	db := ipfsdb.New()

	// Ensure storage directories exist
	artifactsDir := "storage/artifacts"
	manifestsDir := "storage/manifests"
	_ = os.MkdirAll(artifactsDir, 0o755)
	_ = os.MkdirAll(manifestsDir, 0o755)

	// Handlers for node/artifact workflow
	h := handlers.NewHandlers(db, artifactsDir, manifestsDir)

	// Log configuration status
	log.Println("🚀 Starting Proof-of-Art API Server")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	rpcURL := os.Getenv("RPC_URL")
	if rpcURL != "" {
		// Mask sensitive parts of RPC URL
		maskedURL := rpcURL
		if len(maskedURL) > 50 {
			maskedURL = maskedURL[:30] + "..." + maskedURL[len(maskedURL)-10:]
		}
		log.Printf("✅ RPC URL: %s", maskedURL)
	} else {
		log.Println("⚠️  RPC_URL not set - Ethereum features disabled")
	}

	contractAddr := os.Getenv("CONTRACT_ADDRESS")
	if contractAddr != "" {
		log.Printf("✅ Contract Address: %s", contractAddr)
	} else {
		log.Println("⚠️  CONTRACT_ADDRESS not set - deploy contract first and add to .env")
	}

	pinataKey := os.Getenv("PINATA_API_KEY")
	if pinataKey != "" {
		log.Println("✅ Pinata API Key: configured")
	} else {
		log.Println("⚠️  PINATA_API_KEY not set - IPFS features disabled")
	}

	azureTenantID := os.Getenv("AZURE_TENANT_ID")
	if azureTenantID != "" {
		log.Printf("Azure Tenant ID: %s", azureTenantID)
	} else {
		log.Println("AZURE_TENANT_ID not set - using 'common' for multi-tenant")
	}

	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// Handlers for generate/import/certificate workflow
	storage := ipfsdb.NewStorageService(db)
	ipfsClient := ipfsdb.NewIPFSClient(db)
	bcClient := ipfsdb.NewBlockchainClient(db)
	api := handlers.NewHandler(storage, ipfsClient, bcClient)

	// Public endpoints (no authentication required)
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	// Model inference endpoints (proxy to TorchServe)
	e.POST("/model/predict", proxyToTorchServe)
	e.POST("/model/predict/:model", proxyToTorchServe)

	// Protected endpoints (require Microsoft authentication)
	protected := e.Group("")
	protected.Use(auth.JWTAuthMiddleware(db))

	// Verification endpoints - now require authentication
	protected.GET("/verify", h.Verify)
	protected.GET("/verify/:id", api.VerifyArtwork)
	protected.GET("/certificate/:id", api.GetCertificate)

	// Core endpoints (node/artifact flow) - protected
	protected.POST("/ext/push", h.ExtPush)
	protected.POST("/node", h.CreateNode)
	protected.POST("/artifact", h.UploadArtifact)
	protected.POST("/finalize", h.FinalizeManifest)

	// API endpoints (generation/import/certificates) - protected
	protected.POST("/generate", api.GenerateArt)
	protected.POST("/import", api.ImportArt)
	protected.POST("/verify/upload", api.UploadForVerification)

	// Manifest upload endpoint (Pinata + Ethereum) - PUBLIC for hackathon testing
	e.POST("/upload", api.UploadManifest)
	e.POST("/manifests", api.UploadManifest) // Alias for convenience

	addr := ":8080"
	log.Printf("🌐 API listening on %s", addr)
	log.Println("📝 POST /upload - Upload manifest to Pinata and store CID on Ethereum")
	log.Println("🤖 POST /model/predict - Run model inference (proxies to TorchServe)")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	if err := e.Start(addr); err != nil {
		log.Fatal(err)
	}
}
