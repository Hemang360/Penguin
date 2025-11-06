package auth

import (
	"encoding/base64"
	"fmt"
	"time"

	"github.com/google/uuid"

	"yourproject/internal/crypto"
	"yourproject/internal/ipfsdb"
	"yourproject/internal/models"
)

// ProvisionNewUser creates and saves a complete User record for a new authenticator ID.
// This function is called automatically when a user logs in for the first time.
func ProvisionNewUser(db *ipfsdb.IPFSDB, authID string, userInfo *UserInfo) (*models.User, error) {
	// Generate Ed25519 key pair for decentralized authorization
	keyPair, err := crypto.GenerateKeyPair()
	if err != nil {
		return nil, fmt.Errorf("failed to generate crypto keys: %w", err)
	}

	newUser := &models.User{
		ID:              uuid.New().String(),
		WalletAddress:   "", // User will need to set this later via an update endpoint
		PublicKey:       base64.StdEncoding.EncodeToString(keyPair.PublicKey),
		UserType:        "artist", // Default user type
		CreatedAt:       time.Now(),
		AuthenticatorID: authID,
	}

	// Save to DB using the user's ID as the key
	if err := db.Save(newUser.ID, newUser); err != nil {
		return nil, fmt.Errorf("failed to save new user to db: %w", err)
	}

	return newUser, nil
}

