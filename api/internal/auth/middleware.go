package auth

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"

	"yourproject/internal/ipfsdb"
	"yourproject/internal/models"
)

// UserInfo contains the authenticated user information extracted from the JWT
type UserInfo struct {
	UserID   string
	Email    string
	Name     string
	Username string
}

// ValidateMicrosoftJWT validates a Microsoft JWT token and extracts user information
func ValidateMicrosoftJWT(tokenString string) (*UserInfo, error) {
	// Get the tenant ID from environment (optional, can use "common" for multi-tenant)
	tenantID := os.Getenv("AZURE_TENANT_ID")
	if tenantID == "" {
		tenantID = "common"
	}

	// Microsoft's JWKS endpoint
	jwksURL := fmt.Sprintf("https://login.microsoftonline.com/%s/discovery/v2.0/keys", tenantID)

	// Fetch the JWKS (JSON Web Key Set) from Microsoft
	keySet, err := jwk.Fetch(context.Background(), jwksURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
	}

	// Parse and validate the token
	// Note: We validate signature with JWKS but allow flexible issuer validation
	// since Microsoft tokens can have different issuer formats
	token, err := jwt.Parse(
		[]byte(tokenString),
		jwt.WithKeySet(keySet),
		jwt.WithValidate(true),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to parse/validate token: %w", err)
	}

	// Validate issuer manually (more flexible)
	issuer, _ := token.Get("iss")
	issuerStr := fmt.Sprintf("%v", issuer)
	if !strings.Contains(issuerStr, "login.microsoftonline.com") {
		return nil, fmt.Errorf("invalid token issuer: %s", issuerStr)
	}

	// Extract user information from token claims
	userInfo := &UserInfo{}

	// Get user ID (oid or sub claim)
	if oid, ok := token.Get("oid"); ok {
		userInfo.UserID = fmt.Sprintf("%v", oid)
	} else if sub, ok := token.Get("sub"); ok {
		userInfo.UserID = fmt.Sprintf("%v", sub)
	}

	// Get email
	if email, ok := token.Get("email"); ok {
		userInfo.Email = fmt.Sprintf("%v", email)
	}

	// Get preferred username
	if preferredUsername, ok := token.Get("preferred_username"); ok {
		userInfo.Username = fmt.Sprintf("%v", preferredUsername)
	}

	// Get name
	if name, ok := token.Get("name"); ok {
		userInfo.Name = fmt.Sprintf("%v", name)
	}

	return userInfo, nil
}

// JWTAuthMiddleware is an Echo middleware that validates Microsoft JWT tokens,
// automatically provisions users on first login, and attaches the User model to context
func JWTAuthMiddleware(db *ipfsdb.IPFSDB) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Get the Authorization header
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "missing Authorization header",
				})
			}

			// Check if it's a Bearer token
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "invalid Authorization header format, expected 'Bearer <token>'",
				})
			}

			tokenString := parts[1]

			// Validate the token
			userInfo, err := ValidateMicrosoftJWT(tokenString)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": fmt.Sprintf("invalid token: %v", err),
				})
			}

			// Extract AuthenticatorID (Microsoft user ID)
			authenticatorID := userInfo.UserID
			if authenticatorID == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "token missing user identifier",
				})
			}

			// Check if user exists in database
			user, found := db.FindUserByAuthenticatorID(authenticatorID)

			if !found {
				// User doesn't exist - automatically provision them
				log.Printf("🆕 Provisioning new user with AuthenticatorID: %s", authenticatorID)
				newUser, err := ProvisionNewUser(db, authenticatorID, userInfo)
				if err != nil {
					c.Logger().Errorf("failed to provision new user: %v", err)
					return c.JSON(http.StatusInternalServerError, map[string]string{
						"error": "failed to provision user account",
					})
				}
				user = newUser
				log.Printf("✅ User provisioned successfully: ID=%s, AuthenticatorID=%s", user.ID, user.AuthenticatorID)
			}

			// Store both UserInfo (from JWT) and User model (from DB) in context
			c.Set("user", userInfo)           // Keep for backward compatibility
			c.Set("user_id", userInfo.UserID)  // Keep for backward compatibility
			c.Set("db_user", user)             // New: Full User model with PublicKey, WalletAddress, etc.

			return next(c)
		}
	}
}

// OptionalJWTAuthMiddleware is similar to JWTAuthMiddleware but doesn't require authentication
// It validates the token if present and sets user info in context
func OptionalJWTAuthMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Get the Authorization header
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				// No token provided, continue without authentication
				return next(c)
			}

			// Check if it's a Bearer token
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				// Invalid format, but continue anyway (optional auth)
				return next(c)
			}

			tokenString := parts[1]

			// Try to validate the token
			userInfo, err := ValidateMicrosoftJWT(tokenString)
			if err != nil {
				// Token invalid, but continue anyway (optional auth)
				return next(c)
			}

			// Store user info in context for handlers to use
			c.Set("user", userInfo)
			c.Set("user_id", userInfo.UserID)

			return next(c)
		}
	}
}

// GetUserFromContext extracts user information from Echo context
func GetUserFromContext(c echo.Context) (*UserInfo, bool) {
	user, ok := c.Get("user").(*UserInfo)
	return user, ok
}

// GetUserIDFromContext extracts user ID from Echo context
func GetUserIDFromContext(c echo.Context) (string, bool) {
	userID, ok := c.Get("user_id").(string)
	return userID, ok
}

// GetDBUserFromContext extracts the User model from Echo context
// This is the preferred method for handlers that need access to PublicKey, WalletAddress, etc.
func GetDBUserFromContext(c echo.Context) (*models.User, bool) {
	user, ok := c.Get("db_user").(*models.User)
	return user, ok
}
