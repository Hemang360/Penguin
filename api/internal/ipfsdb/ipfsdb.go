package ipfsdb

import (
	"context"
	"fmt"
	"os"
	"time"

	"io"
	"net/http"
	"yourproject/internal/models"
	"yourproject/internal/pinata"
)

// Mock interface for local development (simulates IPFS persistence)
type IPFSDB struct {
	store map[string]interface{}
}

func New() *IPFSDB {
	return &IPFSDB{store: make(map[string]interface{})}
}

func (db *IPFSDB) Save(key string, value interface{}) error {
	db.store[key] = value
	fmt.Println("Saved to mock IPFS:", key)
	return nil
}

func (db *IPFSDB) Get(key string) (interface{}, bool) {
	val, ok := db.store[key]
	return val, ok
}

func (db *IPFSDB) ListKeys() []string {
	keys := make([]string, 0, len(db.store))
	for k := range db.store {
		keys = append(keys, k)
	}
	return keys
}

// FindUserByAuthenticatorID retrieves a user by their Microsoft Authenticator ID
func (db *IPFSDB) FindUserByAuthenticatorID(authID string) (*models.User, bool) {
	// In a real database (like Mongo), you'd run a query:
	// db.Collection("users").FindOne(ctx, bson.M{"authenticator_id": authID})
	
	// For the mock IPFSDB, we must iterate:
	for _, val := range db.store {
		// Only check items that are models.User
		if user, ok := val.(*models.User); ok {
			if user.AuthenticatorID == authID {
				return user, true
			}
		}
	}
	return nil, false
}

// StorageService provides storage operations for artwork
type StorageService struct {
	db     *IPFSDB
	pinata *pinata.Client
}

// NewStorageService creates a new storage service
func NewStorageService(db *IPFSDB) *StorageService {
	return &StorageService{db: db, pinata: pinata.NewFromEnv()}
}

// StoreArtwork stores artwork on IPFS and blockchain
func (s *StorageService) StoreArtwork(ctx context.Context, data []byte, metadata *DAGMetadata) (string, string, error) {
	var cid string
	var err error

	if s.pinata != nil && s.pinata.Enabled() {
		// Use UploadFile method with metadata
		cid, err = s.pinata.UploadFile(data, metadata)
		if err != nil {
			return "", "", fmt.Errorf("pinata upload failed: %w", err)
		}
	} else {
		// Fallback mock CID
		cid = fmt.Sprintf("Qm%s", metadata.ArtworkID)
		if len(cid) > 46 {
			cid = cid[:46]
		}
	}

	// Set ContentCID in metadata
	metadata.ContentCID = cid

	// Mock tx hash or provided by blockchain stub
	txHash := fmt.Sprintf("0x%s", metadata.ArtworkID)
	if len(txHash) > 66 {
		txHash = txHash[:66]
	}

	// Persist mapping in mock DB for quick lookup
	s.db.Save(metadata.ArtworkID, map[string]interface{}{
		"data":     data,
		"metadata": metadata,
		"cid":      cid,
	})

	// Optionally "store" on chain via stubbed client: env controls
	_ = os.Getenv("POLYGON_RPC_URL")
	_ = os.Getenv("POLYGON_CONTRACT_ADDRESS")

	return cid, txHash, nil
}

// VerifyArtwork verifies artwork from blockchain/IPFS
func (s *StorageService) VerifyArtwork(ctx context.Context, artworkID string) (*DAGMetadata, *models.ProofCertificate, error) {
	// Mock implementation
	val, ok := s.db.Get(artworkID)
	if !ok {
		return nil, nil, fmt.Errorf("artwork not found")
	}

	data := val.(map[string]interface{})
	metadata := data["metadata"].(*DAGMetadata)

	proof := &models.ProofCertificate{
		CertificateID:    artworkID,
		ArtworkID:        artworkID,
		ArtistWallet:     metadata.ArtistWallet,
		PromptHash:       metadata.PromptHash,
		ContentHash:      metadata.ContentHash,
		IPFSHash:         metadata.ContentCID,
		BlockchainTxHash: metadata.ContentCID,
		NoiseSignature:   metadata.NoiseSignature,
		Timestamp:        metadata.Timestamp,
		IssuedAt:         time.Now(),
		VerificationURL:  fmt.Sprintf("/verify/%s", artworkID),
	}

	return metadata, proof, nil
}

// IPFSClient provides IPFS operations
type IPFSClient struct {
	db *IPFSDB
}

// NewIPFSClient creates a new IPFS client
func NewIPFSClient(db *IPFSDB) *IPFSClient {
	return &IPFSClient{db: db}
}

// DownloadFile downloads a file from IPFS
func (c *IPFSClient) DownloadFile(cid string) ([]byte, error) {
	val, ok := c.db.Get(cid)
	if !ok {
		// Try gateway if provided
		gateway := os.Getenv("IPFS_GATEWAY")
		if gateway == "" {
			gateway = "https://gateway.pinata.cloud/ipfs"
		}
		url := fmt.Sprintf("%s/%s", gateway, cid)
		resp, err := httpGet(url)
		if err != nil {
			return nil, err
		}
		return resp, nil
	}

	data := val.(map[string]interface{})
	return data["data"].([]byte), nil
}

// httpGet is a tiny indirection to avoid importing net/http at top-level where not needed
func httpGet(url string) ([]byte, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("bad status: %s", resp.Status)
	}
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	return b, nil
}

// BlockchainClient provides blockchain operations
type BlockchainClient struct {
	db *IPFSDB
}

// NewBlockchainClient creates a new blockchain client
func NewBlockchainClient(db *IPFSDB) *BlockchainClient {
	return &BlockchainClient{db: db}
}

// DAGMetadata represents metadata for IPFS DAG
type DAGMetadata struct {
	ArtworkID      string            `json:"artwork_id"`
	ArtistWallet   string            `json:"artist_wallet"`
	PublicKey      string            `json:"public_key"`
	PromptHash     string            `json:"prompt_hash"`
	ContentHash    string            `json:"content_hash"`
	NoiseSignature string            `json:"noise_signature"`
	Timestamp      time.Time         `json:"timestamp"`
	Metadata       map[string]string `json:"metadata"`
	ContentCID     string            `json:"content_cid"`
}
