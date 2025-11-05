package crypto

import (
    "crypto/ed25519"
    "crypto/rand"
    "crypto/sha256"
    "encoding/base64"
    "encoding/json"
    "fmt"

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


