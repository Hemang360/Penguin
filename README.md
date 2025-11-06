# Proof-of-Art (cDNA)

End-to-end scaffold for the cDNA framework: backend (Go + Echo), frontend (React + Vite + Tailwind), and a Chrome extension (TypeScript + Vite).

**Hackathon-Ready**: Complete Ethereum Sepolia integration with Pinata IPFS storage and on-chain manifest storage.

## Prereqs
- Go 1.21+
- Node 20+
- npm or pnpm
- Chrome/Chromium for the extension
- Pinata account (for IPFS storage) - [Sign up](https://pinata.cloud)
- Infura account (for Ethereum Sepolia RPC) - [Sign up](https://infura.io)
- Sepolia testnet ETH - [Get from faucet](https://sepoliafaucet.com/)

## Backend

### Complete Setup Guide

#### 1. Install Hardhat Dependencies

```bash
# At repository root
npm install
```

This installs Hardhat and required tooling for contract deployment.

#### 2. Deploy Smart Contract to Sepolia

```bash
# Make sure you have .env file at root with:
# INFURA_PROJECT_ID=your_infura_project_id
# PRIVATE_KEY=0x... (your wallet private key with Sepolia ETH)

# Deploy contract
npx hardhat run scripts/deploy.js --network sepolia
```

The deploy script will:
- Compile the `ImageProvenance.sol` contract
- Deploy to Sepolia testnet
- Print the deployed contract address
- Write ABI to `api/internal/eth/abi.json`
- Write contract address to `api/internal/eth/contract_address.txt`

**Copy the contract address** - you'll need it for the `.env` file.

#### 3. Configure Backend Environment

```bash
cd api

# Install Go dependencies
go mod tidy

# Create .env file
cp .env.example .env
```

Edit `api/.env` with your credentials:

```bash
# Ethereum Sepolia Configuration
INFURA_PROJECT_ID=your_infura_project_id
RPC_URL=https://sepolia.infura.io/v3/your_infura_project_id

# Private key for signing transactions (DO NOT commit!)
PRIVATE_KEY=0x...  # Your wallet private key (must have Sepolia ETH)

# Contract address (from deployment step above)
CONTRACT_ADDRESS=0x...  # Paste the deployed contract address here

# Pinata IPFS Storage
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_secret
```

#### 4. Run the Backend Server

```bash
cd api
go run ./cmd/server
```

The server will start on `http://localhost:8080` and display configuration status.

**⚠️ Security Note**: Never commit your `.env` file with real private keys or API secrets!

### Endpoints

**Manifest Upload (Pinata + Ethereum):**
- POST `/upload` or POST `/manifests` – Upload image manifest to Pinata and store CID on Ethereum Sepolia
  - Request body:
    ```json
    {
      "image_cid": "Qm...",
      "creator": "0x...",
      "prompt": "A beautiful sunset",
      "model": "DALL-E 3",
      "origin": "https://example.com",
      "timestamp": 1234567890,
      "derived_from": "Qm..." // optional
    }
    ```
  - Response:
    ```json
    {
      "cid": "Qm...",
      "txHash": "0x...",
      "etherscan": "https://sepolia.etherscan.io/tx/0x...",
      "manifest": {...}
    }
    ```

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

### Example: Upload Manifest

```bash
curl -X POST http://localhost:8080/upload \
  -H "Content-Type: application/json" \
  -d '{
    "image_cid": "QmYourImageCID",
    "creator": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "prompt": "A futuristic cityscape at sunset",
    "model": "Midjourney v6",
    "origin": "https://midjourney.com",
    "timestamp": 1704067200
  }'
```

Response:
```json
{
  "cid": "QmManifestCID",
  "txHash": "0xabc123...",
  "etherscan": "https://sepolia.etherscan.io/tx/0xabc123...",
  "manifest": {
    "image_cid": "QmYourImageCID",
    "creator": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    ...
  }
}
```

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
- **Blockchain**: Ethereum Sepolia (via Infura), Solidity smart contracts
- **Storage**: Pinata (IPFS), Ethereum Sepolia (on-chain manifests)
- **Crypto**: Ed25519, BLAKE3, SHA-256, Ethereum cryptography
- **Extension**: TypeScript, Chrome Manifest V3
- **Smart Contracts**: Hardhat, Solidity ^0.8.20

## Notes

- **Crypto**: Ed25519 signatures (detached JWS-like), BLAKE3 for node hashing, SHA-256 for artifacts
- **IPFS**: Uses Pinata for reliable IPFS storage and pinning
- **Blockchain**: Ethereum Sepolia testnet for immutable manifest storage via `ImageProvenance` contract
- **Watermarking**: Deterministic noise patterns tied to user identity
- **Gas Optimization**: Contract uses efficient storage patterns and emits events for off-chain indexing

## Smart Contract

The `ImageProvenance` contract (`contracts/ImageProvenance.sol`) provides:
- `storeManifest(string cid)` - Store manifest CID on-chain
- `getAll()` - Retrieve all stored manifests
- `ManifestStored` event - Emitted when a manifest is stored

Deploy with:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

View deployed contract on [Sepolia Etherscan](https://sepolia.etherscan.io/).

## Roadmap

- [x] Pinata IPFS integration
- [x] Watermarking system
- [x] Certificate generation
- [x] Ethereum Sepolia integration
- [x] On-chain manifest storage
- [ ] Session graph UI
- [ ] Perceptual hash (pHash) for images
- [ ] NFT minting capability
- [ ] Multi-chain support (Polygon, Base, etc.)

