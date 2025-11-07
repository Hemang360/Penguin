package crawler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"yourproject/internal/models"

	"github.com/corona10/goimagehash"
)

// Crawler handles reverse image search and similarity detection
type Crawler struct {
	httpClient       *http.Client
	artworkStore     ArtworkStore
	similarityThresh float64
	checkInterval    time.Duration
	notifications    *NotificationManager
	mu               sync.RWMutex
	running          bool
	cancel           context.CancelFunc
}

// ArtworkStore interface for artwork database operations
type ArtworkStore interface {
	GetAllArtworks(ctx context.Context) ([]*models.Artwork, error)
	GetArtworkByID(ctx context.Context, id string) (*models.Artwork, error)
	StoreCrawlerResult(ctx context.Context, result *models.CrawlerResult) error
	GetCrawlerResultsByArtworkID(ctx context.Context, artworkID string) ([]*models.CrawlerResult, error)
	GetCrawlerResultsByUserID(ctx context.Context, userID string) ([]*models.CrawlerResult, error)
	UpdateCrawlerResultStatus(ctx context.Context, resultID string, status string) error
}

// NotificationManager handles user notifications
type NotificationManager struct {
	notifications map[string][]*models.CrawlerResult // userID -> notifications
	mu            sync.RWMutex
}

// NewNotificationManager creates a new notification manager
func NewNotificationManager() *NotificationManager {
	return &NotificationManager{
		notifications: make(map[string][]*models.CrawlerResult),
	}
}

// AddNotification adds a new notification for a user
func (nm *NotificationManager) AddNotification(userID string, result *models.CrawlerResult) {
	nm.mu.Lock()
	defer nm.mu.Unlock()

	if nm.notifications[userID] == nil {
		nm.notifications[userID] = []*models.CrawlerResult{}
	}
	nm.notifications[userID] = append(nm.notifications[userID], result)
}

// GetNotifications retrieves all notifications for a user
func (nm *NotificationManager) GetNotifications(userID string) []*models.CrawlerResult {
	nm.mu.RLock()
	defer nm.mu.RUnlock()

	return nm.notifications[userID]
}

// ClearNotifications clears all notifications for a user
func (nm *NotificationManager) ClearNotifications(userID string) {
	nm.mu.Lock()
	defer nm.mu.Unlock()

	delete(nm.notifications, userID)
}

// GetUnreadCount returns the count of unread notifications for a user
func (nm *NotificationManager) GetUnreadCount(userID string) int {
	nm.mu.RLock()
	defer nm.mu.RUnlock()

	count := 0
	for _, notif := range nm.notifications[userID] {
		if notif.Status == "pending" {
			count++
		}
	}
	return count
}

// NewCrawler creates a new crawler instance
func NewCrawler(store ArtworkStore, threshold float64, interval time.Duration) *Crawler {
	return &Crawler{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		artworkStore:     store,
		similarityThresh: threshold,
		checkInterval:    interval,
		notifications:    NewNotificationManager(),
		running:          false,
	}
}

// Start begins the crawler loop
func (c *Crawler) Start(ctx context.Context) error {
	c.mu.Lock()
	if c.running {
		c.mu.Unlock()
		return fmt.Errorf("crawler already running")
	}
	c.running = true

	ctx, cancel := context.WithCancel(ctx)
	c.cancel = cancel
	c.mu.Unlock()

	log.Println("🕷️  Starting Proof-of-Art Crawler...")
	ticker := time.NewTicker(c.checkInterval)
	defer ticker.Stop()

	// Run initial scan
	if err := c.crawlAllArtworks(ctx); err != nil {
		log.Printf("Initial crawler scan error: %v\n", err)
	}

	for {
		select {
		case <-ctx.Done():
			c.mu.Lock()
			c.running = false
			c.mu.Unlock()
			log.Println("🛑 Crawler stopped")
			return ctx.Err()
		case <-ticker.C:
			log.Println("🔍 Running scheduled crawler scan...")
			if err := c.crawlAllArtworks(ctx); err != nil {
				log.Printf("Crawler error: %v\n", err)
			}
		}
	}
}

// Stop stops the crawler
func (c *Crawler) Stop() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.running && c.cancel != nil {
		c.cancel()
	}
}

// IsRunning returns whether the crawler is currently running
func (c *Crawler) IsRunning() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.running
}

// crawlAllArtworks processes all registered artworks
func (c *Crawler) crawlAllArtworks(ctx context.Context) error {
	artworks, err := c.artworkStore.GetAllArtworks(ctx)
	if err != nil {
		return fmt.Errorf("failed to get artworks: %w", err)
	}

	log.Printf("📊 Processing %d artworks for similarity detection...", len(artworks))

	for i, artwork := range artworks {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			log.Printf("🔎 [%d/%d] Scanning artwork: %s", i+1, len(artworks), artwork.ID)
			if err := c.processArtwork(ctx, artwork); err != nil {
				log.Printf("⚠️  Error processing artwork %s: %v\n", artwork.ID, err)
				continue
			}

			// Rate limit to avoid overwhelming APIs (be respectful to search engines)
			time.Sleep(3 * time.Second)
		}
	}

	log.Printf("✅ Crawler scan completed. Processed %d artworks.", len(artworks))
	return nil
}

// processArtwork performs reverse image search and similarity check
func (c *Crawler) processArtwork(ctx context.Context, artwork *models.Artwork) error {
	// Download original artwork from IPFS
	originalImg, err := c.downloadImage(artwork.IPFSHash)
	if err != nil {
		return fmt.Errorf("failed to download artwork: %w", err)
	}

	// Calculate pHash of original
	originalHash, err := goimagehash.PerceptionHash(originalImg)
	if err != nil {
		return fmt.Errorf("failed to calculate pHash: %w", err)
	}

	// Perform reverse image search using multiple engines
	searchResults, err := c.reverseImageSearch(ctx, artwork.IPFSHash)
	if err != nil {
		log.Printf("⚠️  Reverse search warning for %s: %v", artwork.ID, err)
		// Continue even if search fails - we'll try again next cycle
		return nil
	}

	if len(searchResults) == 0 {
		log.Printf("ℹ️  No search results found for artwork %s", artwork.ID)
		return nil
	}

	log.Printf("🔍 Found %d potential matches for artwork %s", len(searchResults), artwork.ID)

	// Check each result for similarity
	foundMatches := 0
	for _, result := range searchResults {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			similarImg, err := c.downloadImageFromURL(result.URL)
			if err != nil {
				log.Printf("⚠️  Failed to download %s: %v", result.URL, err)
				continue
			}

			// Calculate similarity
			similarity, tampered := c.checkSimilarity(originalHash, similarImg)

			if similarity >= c.similarityThresh {
				foundMatches++
				// Recompute distance for record
				foundHash, _ := goimagehash.PerceptionHash(similarImg)
				distance, _ := originalHash.Distance(foundHash)

				crawlerResult := &models.CrawlerResult{
					ID:                fmt.Sprintf("%s-%d", artwork.ID, time.Now().UnixNano()),
					OriginalArtworkID: artwork.ID,
					FoundURL:          result.URL,
					SimilarityScore:   similarity,
					PHashDistance:     distance,
					TamperDetected:    tampered,
					DetectedAt:        time.Now(),
					Status:            "pending",
				}

				// Store result in database
				if err := c.artworkStore.StoreCrawlerResult(ctx, crawlerResult); err != nil {
					log.Printf("⚠️  Failed to store crawler result: %v", err)
					continue
				}

				log.Printf("🚨 Match found! Similarity: %.2f%%, URL: %s", similarity*100, result.URL)

				// Add notification for the artist
				c.notifications.AddNotification(artwork.ArtistID, crawlerResult)

				// Alert artist if high similarity detected
				if similarity > 0.80 {
					c.alertArtist(artwork, crawlerResult)
				}
			}
		}
	}

	if foundMatches > 0 {
		log.Printf("⚠️  Found %d potential infringements for artwork %s", foundMatches, artwork.ID)
	}

	return nil
}

// checkSimilarity compares two images using pHash
func (c *Crawler) checkSimilarity(originalHash *goimagehash.ImageHash, img image.Image) (float64, bool) {
	// Calculate pHash of found image
	foundHash, err := goimagehash.PerceptionHash(img)
	if err != nil {
		return 0, false
	}

	// Calculate Hamming distance (0 = identical, 64 = completely different)
	distance, err := originalHash.Distance(foundHash)
	if err != nil {
		return 0, false
	}

	// Convert distance to similarity percentage
	similarity := 1.0 - (float64(distance) / 64.0)

	// Check for tampering (high similarity but not exact match)
	tampered := similarity > 0.85 && distance > 0

	return similarity, tampered
}

// reverseImageSearch performs reverse image search using multiple APIs
func (c *Crawler) reverseImageSearch(ctx context.Context, ipfsHash string) ([]SearchResult, error) {
	results := []SearchResult{}

	// Try Google Reverse Image Search
	googleResults, err := c.searchGoogle(ctx, ipfsHash)
	if err != nil {
		log.Printf("⚠️  Google search failed: %v", err)
	} else {
		results = append(results, googleResults...)
	}

	// Try TinEye API (if available)
	tineyeResults, err := c.searchTinEye(ctx, ipfsHash)
	if err != nil {
		log.Printf("⚠️  TinEye search failed: %v", err)
	} else {
		results = append(results, tineyeResults...)
	}

	// Try Bing Visual Search (if available)
	bingResults, err := c.searchBing(ctx, ipfsHash)
	if err != nil {
		log.Printf("⚠️  Bing search failed: %v", err)
	} else {
		results = append(results, bingResults...)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("all search engines failed")
	}

	return results, nil
}

// SearchResult represents a reverse image search result
type SearchResult struct {
	URL   string
	Title string
}

// searchGoogle performs Google reverse image search
func (c *Crawler) searchGoogle(ctx context.Context, ipfsHash string) ([]SearchResult, error) {
	// Use public IPFS gateways for better accessibility
	imageURL := fmt.Sprintf("https://gateway.pinata.cloud/ipfs/%s", ipfsHash)

	// Google Custom Search API
	apiKey := getEnvOrEmpty("GOOGLE_API_KEY")
	cx := getEnvOrEmpty("GOOGLE_CX")

	if apiKey == "" || cx == "" {
		return nil, fmt.Errorf("Google API credentials not configured")
	}

	apiURL := fmt.Sprintf("https://www.googleapis.com/customsearch/v1?q=%s&searchType=image&key=%s&cx=%s",
		imageURL, apiKey, cx)

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google API returned status %d", resp.StatusCode)
	}

	var response struct {
		Items []struct {
			Link  string `json:"link"`
			Title string `json:"title"`
		} `json:"items"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	results := []SearchResult{}
	for _, item := range response.Items {
		results = append(results, SearchResult{
			URL:   item.Link,
			Title: item.Title,
		})
	}

	return results, nil
}

// searchTinEye performs TinEye reverse image search
func (c *Crawler) searchTinEye(ctx context.Context, ipfsHash string) ([]SearchResult, error) {
	apiKey := getEnvOrEmpty("TINEYE_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("TinEye API key not configured")
	}

	apiURL := "https://api.tineye.com/rest/search/"
	imageURL := fmt.Sprintf("https://gateway.pinata.cloud/ipfs/%s", ipfsHash)

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}

	q := req.URL.Query()
	q.Add("image_url", imageURL)
	q.Add("api_key", apiKey)
	req.URL.RawQuery = q.Encode()

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TinEye API returned status %d", resp.StatusCode)
	}

	var response struct {
		Matches []struct {
			ImageURL string `json:"image_url"`
			Domain   string `json:"domain"`
		} `json:"matches"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	results := []SearchResult{}
	for _, match := range response.Matches {
		results = append(results, SearchResult{
			URL:   match.ImageURL,
			Title: match.Domain,
		})
	}

	return results, nil
}

// searchBing performs Bing visual search
func (c *Crawler) searchBing(ctx context.Context, ipfsHash string) ([]SearchResult, error) {
	apiKey := getEnvOrEmpty("BING_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("Bing API key not configured")
	}

	apiURL := "https://api.bing.microsoft.com/v7.0/images/visualsearch"
	imageURL := fmt.Sprintf("https://gateway.pinata.cloud/ipfs/%s", ipfsHash)

	payload := map[string]interface{}{
		"url": imageURL,
	}
	jsonData, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Ocp-Apim-Subscription-Key", apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Bing API returned status %d", resp.StatusCode)
	}

	var response struct {
		Tags []struct {
			Actions []struct {
				Data struct {
					Value []struct {
						ContentURL string `json:"contentUrl"`
						Name       string `json:"name"`
					} `json:"value"`
				} `json:"data"`
			} `json:"actions"`
		} `json:"tags"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	results := []SearchResult{}
	for _, tag := range response.Tags {
		for _, action := range tag.Actions {
			for _, item := range action.Data.Value {
				results = append(results, SearchResult{
					URL:   item.ContentURL,
					Title: item.Name,
				})
			}
		}
	}

	return results, nil
}

// downloadImage downloads an image from IPFS using multiple gateways
func (c *Crawler) downloadImage(ipfsHash string) (image.Image, error) {
	// Try multiple IPFS gateways for better reliability
	gateways := []string{
		"https://gateway.pinata.cloud/ipfs",
		"https://ipfs.io/ipfs",
		"https://cloudflare-ipfs.com/ipfs",
	}

	var lastErr error
	for _, gateway := range gateways {
		url := fmt.Sprintf("%s/%s", gateway, ipfsHash)
		img, err := c.downloadImageFromURL(url)
		if err == nil {
			return img, nil
		}
		lastErr = err
	}

	return nil, fmt.Errorf("all gateways failed: %w", lastErr)
}

// downloadImageFromURL downloads an image from a URL
func (c *Crawler) downloadImageFromURL(url string) (image.Image, error) {
	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("bad status: %s", resp.Status)
	}

	img, _, err := image.Decode(resp.Body)
	return img, err
}

// alertArtist sends notification to artist about potential infringement
func (c *Crawler) alertArtist(artwork *models.Artwork, result *models.CrawlerResult) {
	log.Printf("🚨 ALERT: Potential infringement detected for artwork %s", artwork.ID)
	log.Printf("   Found at: %s", result.FoundURL)
	log.Printf("   Similarity: %.2f%%", result.SimilarityScore*100)
	log.Printf("   Tamper detected: %v", result.TamperDetected)

	// TODO: Implement actual notification system
	// - Email via SendGrid/SES
	// - Push notification via Firebase/OneSignal
	// - Webhook to artist's dashboard
	// - SMS via Twilio (for critical alerts)
}

// GetNotifications returns all notifications for a user
func (c *Crawler) GetNotifications(userID string) []*models.CrawlerResult {
	return c.notifications.GetNotifications(userID)
}

// GetUnreadCount returns the count of unread notifications
func (c *Crawler) GetUnreadCount(userID string) int {
	return c.notifications.GetUnreadCount(userID)
}

// ClearNotifications clears all notifications for a user
func (c *Crawler) ClearNotifications(userID string) {
	c.notifications.ClearNotifications(userID)
}

// Helper function to safely get environment variable
func getEnvOrEmpty(key string) string {
	return os.Getenv(key)
}

// CalculatePHash calculates perceptual hash of an image
func CalculatePHash(img image.Image) (*goimagehash.ImageHash, error) {
	return goimagehash.PerceptionHash(img)
}

// ComparePHashes compares two pHashes and returns similarity score
func ComparePHashes(hash1, hash2 *goimagehash.ImageHash) (float64, error) {
	distance, err := hash1.Distance(hash2)
	if err != nil {
		return 0, err
	}
	return 1.0 - (float64(distance) / 64.0), nil
}

// BatchProcessArtworks processes multiple artworks in parallel
func (c *Crawler) BatchProcessArtworks(ctx context.Context, artworkIDs []string) error {
	sem := make(chan struct{}, 5) // Limit to 5 concurrent operations to be respectful
	errChan := make(chan error, len(artworkIDs))

	for _, id := range artworkIDs {
		sem <- struct{}{} // Acquire semaphore
		go func(artworkID string) {
			defer func() { <-sem }() // Release semaphore

			artwork, err := c.artworkStore.GetArtworkByID(ctx, artworkID)
			if err != nil {
				errChan <- err
				return
			}

			if err := c.processArtwork(ctx, artwork); err != nil {
				errChan <- err
			}
		}(id)
	}

	// Wait for all goroutines to complete
	for i := 0; i < cap(sem); i++ {
		sem <- struct{}{}
	}

	close(errChan)
	for err := range errChan {
		if err != nil {
			return err
		}
	}

	return nil
}

// GenerateReport creates a report of all detected similarities
func (c *Crawler) GenerateReport(ctx context.Context, artworkID string) (*InfringementReport, error) {
	results, err := c.artworkStore.GetCrawlerResultsByArtworkID(ctx, artworkID)
	if err != nil {
		return nil, fmt.Errorf("failed to get crawler results: %w", err)
	}

	report := &InfringementReport{
		ArtworkID:        artworkID,
		GeneratedAt:      time.Now(),
		TotalFindings:    len(results),
		HighSimilarity:   []models.CrawlerResult{},
		MediumSimilarity: []models.CrawlerResult{},
		LowSimilarity:    []models.CrawlerResult{},
	}

	// Categorize by similarity score
	for _, result := range results {
		if result.SimilarityScore >= 0.90 {
			report.HighSimilarity = append(report.HighSimilarity, *result)
		} else if result.SimilarityScore >= 0.70 {
			report.MediumSimilarity = append(report.MediumSimilarity, *result)
		} else {
			report.LowSimilarity = append(report.LowSimilarity, *result)
		}
	}

	return report, nil
}

// InfringementReport contains statistics about potential infringements
type InfringementReport struct {
	ArtworkID        string
	GeneratedAt      time.Time
	TotalFindings    int
	HighSimilarity   []models.CrawlerResult
	MediumSimilarity []models.CrawlerResult
	LowSimilarity    []models.CrawlerResult
}
