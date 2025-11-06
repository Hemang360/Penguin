# Proof-of-Art (cDNA)

End-to-end scaffold for the cDNA framework: backend (Go + Echo), frontend (React + Vite + Tailwind), and a Chrome extension (TypeScript + Vite).

## Prereqs
- Go 1.21+
- Node 20+
- npm or pnpm
- Chrome/Chromium for the extension
- Pinata account (for IPFS storage) - [Sign up](https://pinata.cloud)

## Backend

### Quick Start
```bash
cd api

# Install dependencies
go mod tidy

# Create .env file (see Environment Variables below)
cp .env.example .env
# Edit .env with your Pinata credentials

# Run server
go run ./cmd/server
# API at http://localhost:8787
```

### Environment Variables

Create `api/.env` with the following:

```bash
# Pinata IPFS Storage (Required for production)
# Get credentials from https://pinata.cloud
PINATA_JWT=eyJhbGciOi...          # Preferred: JWT token
# OR use API key/secret:
PINATA_API_KEY=                    # Alternative to JWT
PINATA_API_SECRET=                 # Alternative to JWT

# IPFS Gateway (for downloading content)
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs

# Polygon Testnet (Optional - for blockchain storage)
POLYGON_RPC_URL=                   # e.g., https://polygon-amoy.infura.io/v3/<key>
POLYGON_CONTRACT_ADDRESS=          # Smart contract address (if deployed)
POLYGON_PRIVATE_KEY=               # Private key for transactions (DO NOT commit)
```

### Endpoints

**Node/Artifact Flow:**
- POST `/ext/push` – receive prompt data from extension
- POST `/node` – create signed node (manual)
- POST `/artifact` – upload media (multipart: file, nodeId)
- POST `/finalize` – build manifest from node/artifact keys
- GET `/verify?key=/ipfs/<key>` – verify signature

**Generation/Certificate Flow:**
- POST `/generate` – generate AI artwork with certification
- POST `/import` – import existing artwork for certification
- GET `/certificate/:id` – get proof certificate for artwork
- POST `/verify/upload` – upload file for verification
- GET `/verify/:id` – verify artwork by ID

**Health:**
- GET `/health` – health check

### IPFS Storage

The system uses **Pinata** for IPFS storage:
- Images are uploaded to Pinata and receive a unique CID
- CIDs are stored in metadata and can be retrieved via gateway
- Fallback to mock storage if Pinata not configured (development only)

## Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set API URL (optional, defaults to http://localhost:8787)
export VITE_API_URL="http://localhost:8787"

# Run development server
npm run dev
# http://localhost:5173
```

**Pages:**
- **Dashboard** – Create, import, and manage certified artworks
- **Verify** – Verify artwork authenticity by ID or file upload
- **Session** – View session graphs and node relationships

## Extension
```bash
cd extension
npm install
npm run build
# Load dist/ as unpacked extension (MV3)
```

- Captures prompt inputs and submits; sends events to backend `/ext/push`.
- Toggle capture from popup.

## Features

- **AI Art Generation** – Generate images with temperature=0 for reproducibility
- **Watermarking** – Unique noise patterns embedded in images (LSB steganography)
- **IPFS Storage** – Content stored on Pinata with unique CIDs
- **Blockchain Proof** – Metadata stored on Polygon testnet (optional)
- **Cryptographic Signing** – Ed25519 signatures for authenticity
- **Chrome Extension** – Import AI art from web pages
- **Public Verification** – Verify artwork authenticity without registration

## Technology Stack

- **Backend**: Go 1.21+, Echo framework
- **Frontend**: React, Vite, Tailwind CSS
- **Storage**: Pinata (IPFS), Polygon testnet (blockchain)
- **Crypto**: Ed25519, BLAKE3, SHA-256
- **Extension**: TypeScript, Chrome Manifest V3

## Notes

- **Crypto**: Ed25519 signatures (detached JWS-like), BLAKE3 for node hashing, SHA-256 for artifacts
- **IPFS**: Uses Pinata for reliable IPFS storage and pinning
- **Blockchain**: Supports Polygon testnet/mainnet for immutable proof storage
- **Watermarking**: Deterministic noise patterns tied to user identity

## Roadmap

- [x] Pinata IPFS integration
- [x] Watermarking system
- [x] Certificate generation
- [ ] Session graph UI
- [ ] Perceptual hash (pHash) for images
- [ ] Full blockchain integration
- [ ] NFT minting capability

