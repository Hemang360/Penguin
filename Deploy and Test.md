# Deployment & Testing Guide

## 🚀 Quick Start (Development)

### 1. Backend Setup

```bash
# Navigate to backend
cd api

# Install Go dependencies
go mod tidy

# Set up environment variables
cat > .env << EOF
# Pinata IPFS Storage (Required)
# Get JWT from https://pinata.cloud/developers/api-keys
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# OR use API key/secret (alternative to JWT)
PINATA_API_KEY=
PINATA_API_SECRET=

# IPFS Gateway (for downloading)
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs

# Polygon Testnet (Optional - for blockchain storage)
POLYGON_RPC_URL=https://polygon-amoy.infura.io/v3/YOUR_PROJECT_ID
POLYGON_CONTRACT_ADDRESS=
POLYGON_PRIVATE_KEY=
EOF

# Run development server
go run ./cmd/server
# API at http://localhost:8787

# OR use Air for hot reload (optional)
go install github.com/cosmtrek/air@latest
air
```

### 2. Pinata IPFS Setup

**Recommended: Use Pinata (Already Integrated)**

1. **Sign up at [Pinata Cloud](https://pinata.cloud)**
2. **Get API credentials:**
   - Go to [API Keys](https://pinata.cloud/developers/api-keys)
   - Create a new API key
   - Copy the JWT token (recommended) OR API Key + Secret

3. **Add to `.env`:**
   ```bash
   PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

**Alternative: Local IPFS Node (Development Only)**
```bash
# Install IPFS
wget https://dist.ipfs.tech/kubo/v0.24.0/kubo_v0.24.0_linux-amd64.tar.gz
tar -xvzf kubo_v0.24.0_linux-amd64.tar.gz
cd kubo
sudo bash install.sh

# Initialize and run
ipfs init
ipfs daemon

# Note: System will use Pinata if configured, otherwise falls back to mock storage
```

### 3. Smart Contract Deployment

```bash
# Install Hardhat
npm install --global hardhat

# Create deployment project
mkdir contracts-deploy
cd contracts-deploy
npx hardhat init

# Copy ProofOfArt.sol to contracts/

# Create deployment script
cat > scripts/deploy.js << 'EOF'
async function main() {
  const ProofOfArt = await ethers.getContractFactory("ProofOfArt");
  const proofOfArt = await ProofOfArt.deploy();
  await proofOfArt.deployed();
  console.log("ProofOfArt deployed to:", proofOfArt.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
EOF

# Configure hardhat.config.js
cat > hardhat.config.js << 'EOF'
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    polygonMumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: ["YOUR_PRIVATE_KEY"]
    },
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: ["YOUR_PRIVATE_KEY"]
    }
  }
};
EOF

# Deploy to Mumbai testnet
npx hardhat run scripts/deploy.js --network polygonMumbai

# Update backend .env with CONTRACT_ADDRESS
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment (optional)
cat > .env << EOF
VITE_API_URL=http://localhost:8787
VITE_CONTRACT_ADDRESS=0x...
VITE_NETWORK=polygon-amoy
EOF

# Run development server
npm run dev
# http://localhost:5173
```

### 5. Chrome Extension Setup

```bash
cd extension

# Install dependencies
npm install

# Build extension
npm run build

# Load in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select extension/dist folder
```

## 🧪 Testing

### Unit Tests (Backend)

```bash
cd api

# Create test file
cat > internal/crypto/crypto_test.go << 'EOF'
package crypto

import (
	"testing"
)

func TestGenerateKeyPair(t *testing.T) {
	kp, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("Failed to generate key pair: %v", err)
	}
	if len(kp.PublicKey) != 32 {
		t.Error("Invalid public key length")
	}
}

func TestSignAndVerify(t *testing.T) {
	kp, _ := GenerateKeyPair()
	data := []byte("test data")
	signature := SignData(kp.PrivateKey, data)
	
	if !VerifySignature(kp.PublicKey, data, signature) {
		t.Error("Signature verification failed")
	}
}

func TestNoisePattern(t *testing.T) {
	pattern, err := GenerateNoisePattern("user123", 1024, 1024)
	if err != nil {
		t.Fatalf("Failed to generate noise pattern: %v", err)
	}
	if len(pattern.Coordinates) != 100 {
		t.Error("Expected 100 coordinates")
	}
}
EOF

# Run tests
go test ./...
```

### Integration Tests

```bash
# Test artwork generation flow
cat > test_generate.sh << 'EOF'
#!/bin/bash

# Health check
curl http://localhost:8787/health | jq

# Generate artwork (uploads to Pinata if configured)
curl -X POST http://localhost:8787/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
    "prompt": "A beautiful sunset over mountains",
    "content_type": "image",
    "llm_provider": "openai",
    "parameters": {}
  }' | jq

# Verify by key
curl "http://localhost:8787/verify?key=/ipfs/Qm..." | jq

# Get certificate
curl http://localhost:8787/certificate/<artworkId> | jq
EOF

chmod +x test_generate.sh
./test_generate.sh
```

### Frontend Tests

```bash
cd frontend

# Install testing libraries
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Create test
cat > src/pages/Dashboard.test.tsx << 'EOF'
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

describe('Dashboard', () => {
  it('renders dashboard title', () => {
    render(<Dashboard />);
    expect(screen.getByText(/Proof-of-Art Studio/i)).toBeInTheDocument();
  });
});
EOF

# Run tests
npm test
```

## 🌐 Production Deployment

### Backend (Using Docker)

```dockerfile
# Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/server .
COPY --from=builder /app/storage ./storage

EXPOSE 8080
CMD ["./server"]
```

```bash
# Build and run
docker build -t proof-of-art-backend .
docker run -p 8787:8787 \
  -e PINATA_JWT=eyJhbGciOi... \
  -e IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs \
  -e POLYGON_RPC_URL=https://polygon-rpc.com \
  -e POLYGON_CONTRACT_ADDRESS=0x... \
  proof-of-art-backend
```

### Frontend (Using Vercel/Netlify)

```bash
# Build for production
cd frontend
npm run build

# Deploy to Vercel
npx vercel --prod

# Or deploy to Netlify
npx netlify deploy --prod --dir=dist
```

### Smart Contract (Production)

```bash
# Deploy to Polygon mainnet
npx hardhat run scripts/deploy.js --network polygon

# Verify on Polygonscan
npx hardhat verify --network polygon CONTRACT_ADDRESS
```

## 📊 Monitoring & Logging

### Backend Logging

```go
// Add to main.go
e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
	Format: "${time_rfc3339} ${method} ${uri} ${status} ${latency_human}\n",
	Output: os.Stdout,
}))
```

### Error Tracking

```bash
# Install Sentry
go get github.com/getsentry/sentry-go

# Add to main.go
import "github.com/getsentry/sentry-go"

sentry.Init(sentry.ClientOptions{
	Dsn: os.Getenv("SENTRY_DSN"),
})
```

### Performance Monitoring

```bash
# Add Prometheus metrics
go get github.com/prometheus/client_golang/prometheus

# Expose metrics endpoint
e.GET("/metrics", echo.WrapHandler(promhttp.Handler()))
```

## 🔒 Security Checklist

- [ ] Environment variables secured (not in git)
- [ ] Private keys stored in secure vault (AWS Secrets Manager, etc.)
- [ ] Rate limiting implemented on API endpoints
- [ ] CORS configured properly
- [ ] Input validation on all endpoints
- [ ] Smart contract audited before mainnet deployment
- [ ] HTTPS/TLS enabled in production
- [ ] Database backups automated
- [ ] IPFS content pinning service configured
- [ ] Monitoring and alerts set up

## 🐛 Common Issues

### Issue: IPFS upload fails
```bash
# Solution: Check Pinata credentials in .env
# Verify PINATA_JWT or PINATA_API_KEY/SECRET are correct
# Test with: curl -X GET "https://api.pinata.cloud/data/testAuthentication" \
#   -H "Authorization: Bearer $PINATA_JWT"

# Or check IPFS gateway is accessible
curl https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
```

### Issue: Smart contract out of gas
```bash
# Solution: Increase gas limit in transaction
# Or use batch operations for multiple artworks
```

### Issue: Watermark detection fails
```bash
# Solution: Check tolerance parameter
# Watermark may be lost if image heavily compressed
# Increase tolerance in DetectWatermark() function
```

## 📈 Performance Optimization

### Backend Optimization

```go
// Use connection pooling for blockchain RPC
client := ethclient.Dial(rpcURL)
defer client.Close()

// Cache IPFS CIDs in Redis
rdb := redis.NewClient(&redis.Options{
    Addr: "localhost:6379",
})

// Use goroutines for parallel processing
var wg sync.WaitGroup
for _, artwork := range artworks {
    wg.Add(1)
    go func(art Artwork) {
        defer wg.Done()
        processArtwork(art)
    }(artwork)
}
wg.Wait()
```

### Frontend Optimization

```javascript
// Lazy load components
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Use React.memo for expensive components
const ArtworkCard = memo(({ artwork }) => {
  // Component code
});

// Debounce API calls
const debouncedSearch = debounce(searchArtworks, 300);
```

## 🎯 Load Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test artwork generation endpoint
ab -n 100 -c 10 -p artwork.json -T application/json \
   http://localhost:8080/api/generate

# Install k6 for more advanced testing
curl -L https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz | tar xvz

# Create load test script
cat > load_test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function() {
  let res = http.post('http://localhost:8080/api/generate', 
    JSON.stringify({
      user_id: 'test_user',
      prompt: 'test prompt',
      content_type: 'image',
      llm_provider: 'openai'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(res, { 'status is 200': (r) => r.status === 200 });
}
EOF

k6 run load_test.js
```

## 📝 Maintenance

### Database Backups
```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/proofofart" --out=/backup

# PostgreSQL backup
pg_dump proofofart > backup.sql
```

### IPFS Pinning Service

**Pinata Integration (Automatic)**
- Images are automatically pinned to Pinata when uploaded
- No manual pinning required
- Content is permanently stored and accessible via gateway

**Manual Pinning (if needed)**
```bash
# Pin existing hash to Pinata
curl -X POST "https://api.pinata.cloud/pinning/pinByHash" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -H "Content-Type: application/json" \
  -d '{"hashToPin": "QmYourIPFSHash"}'
```

### Log Rotation
```bash
# Configure logrotate
sudo cat > /etc/logrotate.d/proofofart << EOF
/var/log/proofofart/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
}
EOF
```

---

## 🎓 Next Steps

1. Complete the crawler implementation for automated detection
2. Add biometric proof-of-human feature
3. Implement audio/video watermarking
4. Create mobile app
5. Add NFT minting capability
6. Set up marketplace for certified artworks

For detailed API documentation, see the OpenAPI spec at `/api/docs`.

For support, open an issue on GitHub or join our Discord community.