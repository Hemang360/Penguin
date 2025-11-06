package main

import (
    "log"
    "net/http"
    "os"

    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
    "github.com/joho/godotenv"

    "yourproject/internal/handlers"
    "yourproject/internal/ipfsdb"
)

func main() {
    _ = godotenv.Load() // load .env if present
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

    // Handlers for generate/import/certificate workflow
    storage := ipfsdb.NewStorageService(db)
    ipfsClient := ipfsdb.NewIPFSClient(db)
    bcClient := ipfsdb.NewBlockchainClient(db)
    api := handlers.NewHandler(storage, ipfsClient, bcClient)

    e.GET("/health", func(c echo.Context) error {
        return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
    })

    // Core endpoints (node/artifact flow)
    e.POST("/ext/push", h.ExtPush)
    e.POST("/node", h.CreateNode)
    e.POST("/artifact", h.UploadArtifact)
    e.POST("/finalize", h.FinalizeManifest)
    e.GET("/verify", h.Verify)

    // API endpoints (generation/import/certificates)
    e.POST("/generate", api.GenerateArt)
    e.POST("/import", api.ImportArt)
    e.GET("/certificate/:id", api.GetCertificate)
    e.POST("/verify/upload", api.UploadForVerification)
    e.GET("/verify/:id", api.VerifyArtwork)

    addr := ":8787"
    log.Println("API listening on", addr)
    if err := e.Start(addr); err != nil {
        log.Fatal(err)
    }
}


