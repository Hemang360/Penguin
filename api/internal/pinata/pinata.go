package pinata

import (
    "bytes"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "os"
)

type Client struct {
    httpClient *http.Client
    authJWT    string
    apiKey     string
    apiSecret  string
}

func NewFromEnv() *Client {
    return &Client{
        httpClient: &http.Client{},
        authJWT:    os.Getenv("PINATA_JWT"),
        apiKey:     os.Getenv("PINATA_API_KEY"),
        apiSecret:  os.Getenv("PINATA_API_SECRET"),
    }
}

func (c *Client) Enabled() bool {
    return c != nil && (c.authJWT != "" || (c.apiKey != "" && c.apiSecret != ""))
}

// UploadBytes uploads raw bytes to Pinata using pinFileToIPFS and returns CID
func (c *Client) UploadBytes(data []byte, filename string) (string, error) {
    if !c.Enabled() {
        return "", fmt.Errorf("pinata not configured")
    }

    var buf bytes.Buffer
    mw := multipart.NewWriter(&buf)
    fw, err := mw.CreateFormFile("file", filename)
    if err != nil { return "", err }
    if _, err := io.Copy(fw, bytes.NewReader(data)); err != nil { return "", err }
    _ = mw.WriteField("pinataOptions", "{}")
    _ = mw.WriteField("pinataMetadata", "{}")
    if err := mw.Close(); err != nil { return "", err }

    req, err := http.NewRequest("POST", "https://api.pinata.cloud/pinning/pinFileToIPFS", &buf)
    if err != nil { return "", err }
    req.Header.Set("Content-Type", mw.FormDataContentType())
    if c.authJWT != "" {
        req.Header.Set("Authorization", "Bearer "+c.authJWT)
    } else {
        req.Header.Set("pinata_api_key", c.apiKey)
        req.Header.Set("pinata_secret_api_key", c.apiSecret)
    }

    resp, err := c.httpClient.Do(req)
    if err != nil { return "", err }
    defer resp.Body.Close()
    if resp.StatusCode < 200 || resp.StatusCode >= 300 {
        b, _ := io.ReadAll(resp.Body)
        return "", fmt.Errorf("pinata upload failed: %s", string(b))
    }

    // Minimal parse to extract IpfsHash
    body, _ := io.ReadAll(resp.Body)
    // Body contains JSON like: {"IpfsHash":"Qm...","PinSize":...,"Timestamp":"..."}
    // Parse naive (avoid new deps):
    s := string(body)
    const key = "\"IpfsHash\":"
    i := bytes.Index([]byte(s), []byte(key))
    if i == -1 { return "", fmt.Errorf("pinata response missing IpfsHash") }
    // find first quote after key
    j := i + len(key)
    // trim spaces
    for j < len(s) && (s[j] == ' ' || s[j] == '\t' || s[j] == '\n' || s[j] == '\r' || s[j] == '"' || s[j] == ':') { j++ }
    // now read until next quote
    // but IpfsHash is JSON string; simplest robust approach is a tiny scan
    start := j
    // find end of string (quote)
    for start < len(s) && s[start] != '"' { start++ }
    start++
    end := start
    for end < len(s) && s[end] != '"' { end++ }
    if start >= len(s) || end > len(s) || end <= start {
        return "", fmt.Errorf("failed to parse IpfsHash")
    }
    cid := s[start:end]
    return cid, nil
}


