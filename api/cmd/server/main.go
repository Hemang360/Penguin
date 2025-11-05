package main

import (
    "log"
    "net/http"
    "os"

    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"

    "whichai/api/internal/handlers"
    "whichai/api/internal/ipfsdb"
)

func main() {
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

    h := handlers.NewHandlers(db, artifactsDir, manifestsDir)

    e.GET("/health", func(c echo.Context) error {
        return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
    })

    // Core endpoints
    e.POST("/ext/push", h.ExtPush)
    e.POST("/node", h.CreateNode)
    e.POST("/artifact", h.UploadArtifact)
    e.POST("/finalize", h.FinalizeManifest)
    e.GET("/verify", h.Verify)

    addr := ":8787"
    log.Println("API listening on", addr)
    if err := e.Start(addr); err != nil {
        log.Fatal(err)
    }
}


