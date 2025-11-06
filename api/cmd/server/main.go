package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"yourproject/internal/auth"
	"yourproject/internal/handlers"
	"yourproject/internal/ipfsdb"
)

func main() {
	// Load .env file automatically (if present)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	} else {
		log.Println(".env file loaded successfully")
	}

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

	// Manifest upload endpoint (Pinata + Ethereum) - protected
	protected.POST("/upload", api.UploadManifest)
	protected.POST("/manifests", api.UploadManifest) // Alias for convenience

	addr := ":8787"
	log.Printf("🌐 API listening on %s", addr)
	log.Println("📝 POST /upload - Upload manifest to Pinata and store CID on Ethereum")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	if err := e.Start(addr); err != nil {
		log.Fatal(err)
	}
}
