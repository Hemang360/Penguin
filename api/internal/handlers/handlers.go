package handlers

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "path/filepath"
    "time"

    "github.com/labstack/echo/v4"

    ccrypto "whichai/api/internal/crypto"
    "whichai/api/internal/ipfsdb"
    "whichai/api/internal/models"
)

type Handlers struct {
    db           *ipfsdb.IPFSDB
    signer       *ccrypto.Signer
    artifactsDir string
    manifestsDir string
}

func NewHandlers(db *ipfsdb.IPFSDB, artifactsDir, manifestsDir string) *Handlers {
    signer, _ := ccrypto.NewSigner()
    return &Handlers{db: db, signer: signer, artifactsDir: artifactsDir, manifestsDir: manifestsDir}
}

// ExtPush receives prompt data from the extension
func (h *Handlers) ExtPush(c echo.Context) error {
    var body map[string]interface{}
    if err := c.Bind(&body); err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
    }

    node := models.Node{
        Kind:      "prompt.v1",
        Author:    h.signer.KeyID(),
        Body:      body,
        CreatedAt: time.Now().UTC(),
    }
    payload, _ := json.Marshal(node.Body)
    node.Hash = ccrypto.Blake3Hex(payload)
    node.ID = fmt.Sprintf("csg:%s", node.Hash[:12])
    jws, _ := h.signer.JWSDetached(payload)
    node.Sig = models.Signature{Alg: "Ed25519", KeyID: h.signer.KeyID(), JWS: jws}

    key := fmt.Sprintf("/ipfs/%s", node.Hash)
    if err := h.db.Save(key, node); err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
    }
    return c.JSON(http.StatusOK, node)
}

// CreateNode allows manual node creation
func (h *Handlers) CreateNode(c echo.Context) error {
    var req struct {
        Kind   string                 `json:"kind"`
        Author string                 `json:"author"`
        Body   map[string]interface{} `json:"body"`
    }
    if err := c.Bind(&req); err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
    }
    node := models.Node{
        Kind:      req.Kind,
        Author:    ifEmpty(req.Author, h.signer.KeyID()),
        Body:      req.Body,
        CreatedAt: time.Now().UTC(),
    }
    payload, _ := json.Marshal(node.Body)
    node.Hash = ccrypto.Blake3Hex(payload)
    node.ID = fmt.Sprintf("csg:%s", node.Hash[:12])
    jws, _ := h.signer.JWSDetached(payload)
    node.Sig = models.Signature{Alg: "Ed25519", KeyID: h.signer.KeyID(), JWS: jws}
    key := fmt.Sprintf("/ipfs/%s", node.Hash)
    if err := h.db.Save(key, node); err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
    }
    return c.JSON(http.StatusOK, node)
}

// UploadArtifact accepts a media file and links to a node
func (h *Handlers) UploadArtifact(c echo.Context) error {
    nodeID := c.FormValue("nodeId")
    fileHeader, err := c.FormFile("file")
    if err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": "file is required"})
    }
    f, err := fileHeader.Open()
    if err != nil { return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()}) }
    defer f.Close()
    bytes, err := io.ReadAll(f)
    if err != nil { return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()}) }

    sha := ccrypto.SHA256Hex(bytes)
    name := fmt.Sprintf("%s_%s", sha[:16], fileHeader.Filename)
    dst := filepath.Join(h.artifactsDir, name)
    if err := os.WriteFile(dst, bytes, 0o644); err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
    }
    art := models.Artifact{
        ID:        fmt.Sprintf("art:%s", sha[:12]),
        NodeID:    nodeID,
        Name:      fileHeader.Filename,
        MediaType: fileHeader.Header.Get("Content-Type"),
        Size:      fileHeader.Size,
        SHA256:    sha,
        Path:      dst,
        CreatedAt: time.Now().UTC(),
    }
    key := fmt.Sprintf("/ipfs/%s", sha)
    if err := h.db.Save(key, art); err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
    }
    return c.JSON(http.StatusOK, art)
}

// FinalizeManifest combines nodes and artifacts into a manifest
func (h *Handlers) FinalizeManifest(c echo.Context) error {
    var req struct {
        SessionID string   `json:"sessionId"`
        NodeKeys  []string `json:"nodeKeys"`
        ArtKeys   []string `json:"artifactKeys"`
    }
    if err := c.Bind(&req); err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
    }
    var nodes []models.Node
    var arts []models.Artifact
    for _, k := range req.NodeKeys {
        v, ok := h.db.Get(k)
        if ok {
            if n, ok2 := v.(models.Node); ok2 {
                nodes = append(nodes, n)
            }
        }
    }
    for _, k := range req.ArtKeys {
        v, ok := h.db.Get(k)
        if ok {
            if a, ok2 := v.(models.Artifact); ok2 {
                arts = append(arts, a)
            }
        }
    }
    man := models.Manifest{
        ID:        fmt.Sprintf("man:%s", ccrypto.Blake3Hex([]byte(req.SessionID))[:12]),
        SessionID: req.SessionID,
        Nodes:     nodes,
        Artifacts: arts,
        CreatedAt: time.Now().UTC(),
    }
    payload, _ := json.Marshal(man)
    jws, _ := h.signer.JWSDetached(payload)
    man.Sig = models.Signature{Alg: "Ed25519", KeyID: h.signer.KeyID(), JWS: jws}

    key := fmt.Sprintf("/ipfs/%s", ccrypto.Blake3Hex(payload))
    if err := h.db.Save(key, man); err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
    }
    // also store a pretty JSON file
    file := filepath.Join(h.manifestsDir, man.ID+".json")
    _ = os.WriteFile(file, payload, 0o644)
    return c.JSON(http.StatusOK, map[string]interface{}{"manifest": man, "ipfsKey": key, "file": file})
}

// Verify checks a manifest or node key and verifies sig
func (h *Handlers) Verify(c echo.Context) error {
    key := c.QueryParam("key")
    v, ok := h.db.Get(key)
    if !ok {
        return c.JSON(http.StatusNotFound, map[string]string{"error": "not found"})
    }
    switch t := v.(type) {
    case models.Node:
        payload, _ := json.Marshal(t.Body)
        return c.JSON(http.StatusOK, map[string]interface{}{
            "type":    "node",
            "valid":   h.signer.VerifyDetached(t.Sig.JWS, payload),
            "author":  t.Author,
            "hash":    t.Hash,
            "created": t.CreatedAt,
        })
    case models.Manifest:
        payload, _ := json.Marshal(t)
        return c.JSON(http.StatusOK, map[string]interface{}{
            "type":    "manifest",
            "valid":   h.signer.VerifyDetached(t.Sig.JWS, payload),
            "session": t.SessionID,
            "created": t.CreatedAt,
        })
    default:
        return c.JSON(http.StatusOK, map[string]interface{}{"type": "unknown"})
    }
}

func ifEmpty(s string, alt string) string {
    if s == "" {
        return alt
    }
    return s
}


