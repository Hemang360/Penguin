package models

import (
	"time"
)

// User represents an artist or admirer in the system
type User struct {
	ID              string    `json:"id" bson:"_id"`
	WalletAddress   string    `json:"wallet_address" bson:"wallet_address"`
	PublicKey       string    `json:"public_key" bson:"public_key"`
	UserType        string    `json:"user_type" bson:"user_type"` // "artist" or "admirer"
	CreatedAt       time.Time `json:"created_at" bson:"created_at"`
	AuthenticatorID string    `json:"authenticator_id" bson:"authenticator_id"`
}

// Artwork represents a generated or imported AI artwork
type Artwork struct {
	ID                string            `json:"id" bson:"_id"`
	ArtistID          string            `json:"artist_id" bson:"artist_id"`
	Title             string            `json:"title" bson:"title"`
	Prompt            string            `json:"prompt" bson:"prompt"`
	PromptHash        string            `json:"prompt_hash" bson:"prompt_hash"`
	ContentType       string            `json:"content_type" bson:"content_type"` // "image", "video", "audio", "text"
	OriginalFileHash  string            `json:"original_file_hash" bson:"original_file_hash"`
	WatermarkedHash   string            `json:"watermarked_hash" bson:"watermarked_hash"`
	IPFSHash          string            `json:"ipfs_hash" bson:"ipfs_hash"`
	PublicKeyEmbedded string            `json:"public_key_embedded" bson:"public_key_embedded"`
	NoisePattern      string            `json:"noise_pattern" bson:"noise_pattern"` // Unique pixel arrangement signature
	GPGSignature      string            `json:"gpg_signature" bson:"gpg_signature"`
	BlockchainTxHash  string            `json:"blockchain_tx_hash" bson:"blockchain_tx_hash"`
	DAGNodeID         string            `json:"dag_node_id" bson:"dag_node_id"`
	Metadata          map[string]string `json:"metadata" bson:"metadata"`
	CreatedAt         time.Time         `json:"created_at" bson:"created_at"`
	LLMProvider       string            `json:"llm_provider" bson:"llm_provider"` // "openai", "stability", "midjourney", etc.
	Temperature       float64           `json:"temperature" bson:"temperature"`
}

// ProofCertificate represents the immutable proof-of-art certificate
type ProofCertificate struct {
	CertificateID     string    `json:"certificate_id" bson:"_id"`
	ArtworkID         string    `json:"artwork_id" bson:"artwork_id"`
	ArtistWallet      string    `json:"artist_wallet" bson:"artist_wallet"`
	Prompt            string    `json:"prompt" bson:"prompt"`
	PromptHash        string    `json:"prompt_hash" bson:"prompt_hash"`
	ContentHash       string    `json:"content_hash" bson:"content_hash"`
	IPFSHash          string    `json:"ipfs_hash" bson:"ipfs_hash"`
	BlockchainTxHash  string    `json:"blockchain_tx_hash" bson:"blockchain_tx_hash"`
	GPGSignature      string    `json:"gpg_signature" bson:"gpg_signature"`
	NoiseSignature    string    `json:"noise_signature" bson:"noise_signature"`
	Timestamp         time.Time `json:"timestamp" bson:"timestamp"`
	IssuedAt          time.Time `json:"issued_at" bson:"issued_at"`
	VerificationURL   string    `json:"verification_url" bson:"verification_url"`
	SmartContractAddr string    `json:"smart_contract_addr" bson:"smart_contract_addr"`
}

// VerificationRequest represents a request to verify artwork authenticity
type VerificationRequest struct {
	FileHash      string `json:"file_hash"`
	PublicKey     string `json:"public_key"`
	ArtworkID     string `json:"artwork_id"`
	ExtractedData []byte `json:"extracted_data"`
}

// VerificationResult represents the result of artwork verification
type VerificationResult struct {
	IsAuthentic       bool      `json:"is_authentic"`
	ArtworkID         string    `json:"artwork_id"`
	OriginalArtist    string    `json:"original_artist"`
	CreationDate      time.Time `json:"creation_date"`
	Prompt            string    `json:"prompt"`
	TamperDetected    bool      `json:"tamper_detected"`
	SimilarityScore   float64   `json:"similarity_score"`
	BlockchainTxHash  string    `json:"blockchain_tx_hash"`
	CertificateURL    string    `json:"certificate_url"`
	VerificationSteps []string  `json:"verification_steps"`
}

// GenerationRequest represents a request to generate AI content
type GenerationRequest struct {
	UserID      string            `json:"user_id"`
	Prompt      string            `json:"prompt"`
	ContentType string            `json:"content_type"` // "image", "text", "audio"
	LLMProvider string            `json:"llm_provider"`
	Parameters  map[string]string `json:"parameters"`
}

// ImportRequest represents artwork imported from chrome extension
type ImportRequest struct {
	UserID         string            `json:"user_id"`
	SourceURL      string            `json:"source_url"`
	ContentType    string            `json:"content_type"`
	FileData       []byte            `json:"file_data"`
	Prompt         string            `json:"prompt"`
	SourcePlatform string            `json:"source_platform"`
	Metadata       map[string]string `json:"metadata"`
}

// CrawlerResult represents findings from the similarity crawler
type CrawlerResult struct {
	ID                string    `json:"id" bson:"_id"`
	OriginalArtworkID string    `json:"original_artwork_id" bson:"original_artwork_id"`
	FoundURL          string    `json:"found_url" bson:"found_url"`
	SimilarityScore   float64   `json:"similarity_score" bson:"similarity_score"`
	PHashDistance     int       `json:"phash_distance" bson:"phash_distance"`
	TamperDetected    bool      `json:"tamper_detected" bson:"tamper_detected"`
	DetectedAt        time.Time `json:"detected_at" bson:"detected_at"`
	Status            string    `json:"status" bson:"status"` // "pending", "verified", "infringement"
}

// DAGNode represents a node in the IPFS DAG structure
type DAGNode struct {
	NodeID       string            `json:"node_id"`
	PublicKey    string            `json:"public_key"`
	ArtworkData  []byte            `json:"artwork_data"`
	NoisePattern []byte            `json:"noise_pattern"`
	Metadata     map[string]string `json:"metadata"`
	Links        []string          `json:"links"`
	Timestamp    time.Time         `json:"timestamp"`
}

// BiometricProof represents proof-of-human signature (optional IoT feature)
type BiometricProof struct {
	UserID     string    `json:"user_id"`
	FacialHash string    `json:"facial_hash"`
	Timestamp  time.Time `json:"timestamp"`
	DeviceID   string    `json:"device_id"`
	Signature  string    `json:"signature"`
}
