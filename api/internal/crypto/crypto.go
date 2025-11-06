package crypto

import (
    "crypto/ed25519"
    "crypto/rand"
    "crypto/sha256"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "image"
    "image/color"

    "github.com/zeebo/blake3"
)

type Signer struct {
    privateKey ed25519.PrivateKey
    publicKey  ed25519.PublicKey
    keyID      string
}

func NewSigner() (*Signer, error) {
    pub, priv, err := ed25519.GenerateKey(rand.Reader)
    if err != nil {
        return nil, err
    }
    // keyID is base64 of public key
    kid := base64.RawURLEncoding.EncodeToString(pub)
    return &Signer{privateKey: priv, publicKey: pub, keyID: kid}, nil
}

func (s *Signer) PublicKey() string {
    return base64.RawURLEncoding.EncodeToString(s.publicKey)
}

func (s *Signer) KeyID() string { return s.keyID }

// Blake3Hex computes BLAKE3 hash as hex string
func Blake3Hex(data []byte) string {
    sum := blake3.Sum256(data)
    return fmt.Sprintf("%x", sum[:])
}

// SHA256Hex computes SHA-256 hash as hex string
func SHA256Hex(data []byte) string {
    sum := sha256.Sum256(data)
    return fmt.Sprintf("%x", sum[:])
}

// JWSDetached returns a simple detached JWS string: base64url(header).base64url(payload).base64url(signature)
// with an empty payload segment per detached convention.
func (s *Signer) JWSDetached(payload []byte) (string, error) {
    header := map[string]string{
        "alg": "EdDSA",
        "kid": s.keyID,
        "typ": "JWT",
    }
    headerJSON, _ := json.Marshal(header)
    headerB64 := base64.RawURLEncoding.EncodeToString(headerJSON)
    // Detached: middle segment empty
    signingInput := []byte(headerB64 + "." + ".")
    signingInput = append(signingInput, payload...)

    sig := ed25519.Sign(s.privateKey, signingInput)
    sigB64 := base64.RawURLEncoding.EncodeToString(sig)
    return headerB64 + "." + "." + sigB64, nil
}

func (s *Signer) VerifyDetached(jws string, payload []byte) bool {
    // very simplified split
    var headerB64, sigB64 string
    // format: header..sig
    n := len(jws)
    // find first '.' and last '.'
    first := -1
    last := -1
    for i := 0; i < n; i++ {
        if jws[i] == '.' {
            if first == -1 {
                first = i
            }
            last = i
        }
    }
    if first == -1 || last == -1 || first == last {
        return false
    }
    headerB64 = jws[:first]
    sigB64 = jws[last+1:]
    sig, err := base64.RawURLEncoding.DecodeString(sigB64)
    if err != nil { return false }
    signingInput := []byte(headerB64 + "." + ".")
    signingInput = append(signingInput, payload...)
    return ed25519.Verify(s.publicKey, signingInput, sig)
}

// KeyPair represents an Ed25519 key pair
type KeyPair struct {
	PublicKey  []byte
	PrivateKey []byte
}

// GenerateKeyPair generates a new Ed25519 key pair
func GenerateKeyPair() (*KeyPair, error) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}
	return &KeyPair{
		PublicKey:  pub,
		PrivateKey: priv,
	}, nil
}

// HashPrompt hashes a prompt string using BLAKE3
func HashPrompt(prompt string) string {
	return Blake3Hex([]byte(prompt))
}

// HashFile hashes file data using BLAKE3
func HashFile(data []byte) string {
	return Blake3Hex(data)
}

// NoisePattern represents a unique noise pattern for watermarking
type NoisePattern struct {
	Pattern  []byte
	Signature string
}

// GenerateNoisePattern generates a unique noise pattern for a user
func GenerateNoisePattern(userID string, width, height int) (*NoisePattern, error) {
	// Generate deterministic noise based on userID
	seed := Blake3Hex([]byte(userID))
	pattern := make([]byte, width*height*4) // RGBA
	
	// Simple deterministic pattern generation
	hash := Blake3Hex([]byte(seed))
	for i := 0; i < len(pattern); i++ {
		pattern[i] = hash[i%len(hash)]
	}
	
	return &NoisePattern{
		Pattern:   pattern,
		Signature: seed,
	}, nil
}

// ApplyWatermark applies a watermark to an image
func ApplyWatermark(img image.Image, pattern *NoisePattern, publicKey string) (image.Image, error) {
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	
	// Create new RGBA image
	watermarked := image.NewRGBA(bounds)
	
	// Copy original image
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			watermarked.Set(x, y, img.At(x, y))
		}
	}
	
	// Apply subtle watermark (LSB steganography)
	keyBytes := []byte(publicKey)
	for y := 0; y < height && y < len(pattern.Pattern)/width/4; y++ {
		for x := 0; x < width && x < len(pattern.Pattern)/height/4; x++ {
			idx := (y*width + x) * 4
			if idx < len(pattern.Pattern) {
				// Modify LSB of each channel
				r, g, b, a := watermarked.At(x, y).RGBA()
				patternByte := pattern.Pattern[idx%len(pattern.Pattern)]
				keyByte := keyBytes[idx%len(keyBytes)]
				
				// Apply subtle changes
				newR := uint8((r>>8)&0xFE) | (patternByte & 0x01)
				newG := uint8((g>>8)&0xFE) | ((keyByte >> 1) & 0x01)
				newB := uint8((b>>8)&0xFE) | ((keyByte >> 2) & 0x01)
				
				watermarked.SetRGBA(x, y, color.RGBA{
					R: newR,
					G: newG,
					B: newB,
					A: uint8(a >> 8),
				})
			}
		}
	}
	
	return watermarked, nil
}

// DetectWatermark detects a watermark in an image
func DetectWatermark(img image.Image, expectedPattern *NoisePattern, threshold float64) (bool, float64) {
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	
	matches := 0
	total := 0
	
	pattern := expectedPattern.Pattern
	for y := 0; y < height && y < len(pattern)/width/4; y++ {
		for x := 0; x < width && x < len(pattern)/height/4; x++ {
			idx := (y*width + x) * 4
			if idx < len(pattern) {
                r, _, _, _ := img.At(x, y).RGBA()
				expectedLSB := pattern[idx%len(pattern)] & 0x01
				
				actualLSB := uint8(r>>8) & 0x01
				if actualLSB == expectedLSB {
					matches++
				}
				total++
			}
		}
	}
	
	if total == 0 {
		return false, 0.0
	}
	
	confidence := float64(matches) / float64(total)
	return confidence >= threshold, confidence
}


