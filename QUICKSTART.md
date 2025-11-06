# Quick Start Guide

Get Proof-of-Art running in 5 minutes!

## Prerequisites

- Go 1.21+ installed
- Node.js 20+ installed
- Pinata account ([Sign up free](https://pinata.cloud))

## Step 1: Get Pinata Credentials

1. Go to [Pinata Cloud](https://pinata.cloud) and sign up
2. Navigate to [API Keys](https://pinata.cloud/developers/api-keys)
3. Create a new API key
4. Copy your **JWT token** (starts with `eyJ...`)

## Step 2: Backend Setup

```bash
cd api

# Install dependencies
go mod tidy

# Create .env file
cat > .env << EOF
PINATA_JWT=your_jwt_token_here
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs
EOF

# Run server
go run ./cmd/server
```

✅ Backend running at `http://localhost:8787`

## Step 3: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

✅ Frontend running at `http://localhost:5173`

## Step 4: Test It!

1. Open `http://localhost:5173` in your browser
2. Enter a prompt (e.g., "A futuristic penguin")
3. Click "Generate & Certify"
4. Your artwork will be:
   - Generated (if LLM API configured)
   - Watermarked
   - Uploaded to Pinata
   - Assigned a unique CID
   - Certified with blockchain proof

## Verify Upload

Check your Pinata dashboard to see the uploaded files with their CIDs!

## Troubleshooting

**Backend won't start:**
- Check `.env` file exists in `api/` directory
- Verify `PINATA_JWT` is set correctly
- Run `go mod tidy` to ensure dependencies are installed

**Frontend can't connect:**
- Ensure backend is running on port 8787
- Check browser console for errors
- Verify `VITE_API_URL` is set to `http://localhost:8787`

**Pinata upload fails:**
- Verify JWT token is valid
- Check Pinata account has available storage
- Test token: `curl -X GET "https://api.pinata.cloud/data/testAuthentication" -H "Authorization: Bearer $PINATA_JWT"`

## Next Steps

- Deploy smart contract to Polygon testnet
- Configure LLM API keys for generation
- Set up production environment variables
- See `Deploy and Test.md` for full deployment guide

