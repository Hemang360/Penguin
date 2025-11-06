package crawler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"net/http"
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
}

// ArtworkStore interface for artwork database operations
type ArtworkStore interface {
	GetAllArtworks(ctx context.Context) ([]*models.Artwork, error)
	GetArtworkByID(ctx context.Context, id string) (*models.Artwork, error)
	StoreCrawlerResult(ctx context.Context, result *models.CrawlerResult) error
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
	}
}

// Start begins the crawler loop
func (c *Crawler) Start(ctx context.Context) error {
	ticker := time.NewTicker(c.checkInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := c.crawlAllArtworks(ctx); err != nil {
				fmt.Printf("Crawler error: %v\n", err)
			}
		}
	}
}

// crawlAllArtworks processes all registered artworks
func (c *Crawler) crawlAllArtworks(ctx context.Context) error {
	artworks, err := c.artworkStore.GetAllArtworks(ctx)
	if err != nil {
		return fmt.Errorf("failed to get artworks: %w", err)
	}

	for _, artwork := range artworks {
		if err := c.processArtwork(ctx, artwork); err != nil {
			fmt.Printf("Error processing artwork %s: %v\n", artwork.ID, err)
			continue
		}

		// Rate limit to avoid overwhelming APIs
		time.Sleep(5 * time.Second)
	}

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
		return fmt.Errorf("reverse search failed: %w", err)
	}

	// Check each result for similarity
	for _, result := range searchResults {
		similarImg, err := c.downloadImageFromURL(result.URL)
		if err != nil {
			fmt.Printf("Failed to download %s: %v\n", result.URL, err)
			continue
		}

		// Calculate similarity
		similarity, tampered := c.checkSimilarity(originalHash, similarImg)

		if similarity >= c.similarityThresh {
			// Store potential infringement
        // Recompute distance for record
        foundHash, _ := goimagehash.PerceptionHash(similarImg)
        d, _ := originalHash.Distance(foundHash)
        crawlerResult := &models.CrawlerResult{
				ID:                fmt.Sprintf("%s-%d", artwork.ID, time.Now().Unix()),
				OriginalArtworkID: artwork.ID,
				FoundURL:          result.URL,
				SimilarityScore:   similarity,
            PHashDistance:     d,
				TamperDetected:    tampered,
				DetectedAt:        time.Now(),
				Status:            "pending",
			}

			if err := c.artworkStore.StoreCrawlerResult(ctx, crawlerResult); err != nil {
				fmt.Printf("Failed to store crawler result: %v\n", err)
			}

			// Alert artist if high similarity and tampering detected
			if similarity > 0.90 && tampered {
				c.alertArtist(artwork, crawlerResult)
			}
		}
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

	// Google Reverse Image Search
	googleResults, err := c.searchGoogle(ctx, ipfsHash)
	if err == nil {
		results = append(results, googleResults...)
	}

	// TinEye API
	tineyeResults, err := c.searchTinEye(ctx, ipfsHash)
	if err == nil {
		results = append(results, tineyeResults...)
	}

	// Bing Visual Search
	bingResults, err := c.searchBing(ctx, ipfsHash)
	if err == nil {
		results = append(results, bingResults...)
	}

	return results, nil
}

// SearchResult represents a reverse image search result
type SearchResult struct {
	URL   string
	Hash  *goimagehash.ImageHash
	Title string
}

// searchGoogle performs Google reverse image search
func (c *Crawler) searchGoogle(ctx context.Context, ipfsHash string) ([]SearchResult, error) {
	// This is a simplified implementation
	// In production, use Google Custom Search API

	imageURL := fmt.Sprintf("https://ipfs.io/ipfs/%s", ipfsHash)
	apiURL := fmt.Sprintf("https://www.googleapis.com/customsearch/v1?q=%s&searchType=image&key=YOUR_API_KEY&cx=YOUR_CX",
		imageURL)

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

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
	// TinEye API implementation
	// Requires API key from tineye.com

	apiURL := "https://api.tineye.com/rest/search/"
	imageURL := fmt.Sprintf("https://ipfs.io/ipfs/%s", ipfsHash)

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}

	q := req.URL.Query()
	q.Add("image_url", imageURL)
	q.Add("api_key", "YOUR_TINEYE_API_KEY")
	req.URL.RawQuery = q.Encode()

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var response struct {
		Matches []struct {
			ImageURL string `json:"image_url"`
		} `json:"matches"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	results := []SearchResult{}
	for _, match := range response.Matches {
		results = append(results, SearchResult{
			URL: match.ImageURL,
		})
	}

	return results, nil
}

// searchBing performs Bing visual search
func (c *Crawler) searchBing(ctx context.Context, ipfsHash string) ([]SearchResult, error) {
	// Bing Visual Search API
	apiURL := "https://api.bing.microsoft.com/v7.0/images/visualsearch"
	imageURL := fmt.Sprintf("https://ipfs.io/ipfs/%s", ipfsHash)

	payload := map[string]interface{}{
		"url": imageURL,
	}
	jsonData, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Ocp-Apim-Subscription-Key", "YOUR_BING_API_KEY")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

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

// downloadImage downloads an image from IPFS
func (c *Crawler) downloadImage(ipfsHash string) (image.Image, error) {
	url := fmt.Sprintf("https://ipfs.io/ipfs/%s", ipfsHash)
	return c.downloadImageFromURL(url)
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
	// Send email, push notification, or webhook
	fmt.Printf("ALERT: Potential infringement detected for artwork %s\n", artwork.ID)
	fmt.Printf("Found at: %s\n", result.FoundURL)
	fmt.Printf("Similarity: %.2f%%\n", result.SimilarityScore*100)

	// TODO: Implement actual notification system
	// - Email via SendGrid/SES
	// - Push notification via Firebase
	// - Webhook to artist's dashboard
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
	sem := make(chan struct{}, 10) // Limit to 10 concurrent operations
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
	// Fetch all crawler results for this artwork
	// Group by similarity score
	// Generate statistics

	report := &InfringementReport{
		ArtworkID:        artworkID,
		GeneratedAt:      time.Now(),
		TotalFindings:    0,
		HighSimilarity:   []models.CrawlerResult{},
		MediumSimilarity: []models.CrawlerResult{},
		LowSimilarity:    []models.CrawlerResult{},
	}

	// TODO: Implement report generation logic

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
