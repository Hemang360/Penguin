# Quick Start Guide for Judges

This guide will help you quickly set up and run the Proof-of-Art system.

## Prerequisites Checklist

- [ ] Go 1.21+ installed
- [ ] Node.js 20+ installed
- [ ] Infura account (free) - [Sign up](https://infura.io)
- [ ] Pinata account (free) - [Sign up](https://pinata.cloud)
- [ ] Sepolia testnet ETH - [Get from faucet](https://sepoliafaucet.com/)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Install Hardhat and Node dependencies
npm install

# Install Go dependencies
cd api
go mod tidy
cd ..
```

### 2. Configure Environment Variables

#### Root `.env` (for contract deployment)

Create `.env` at the repository root:

```bash
INFURA_PROJECT_ID=your_infura_project_id_here
PRIVATE_KEY=0x...your_private_key_here
```

#### API `.env` (for backend server)

```bash
cd api
cp .env.example .env
```

Edit `api/.env`:

```bash
INFURA_PROJECT_ID=your_infura_project_id_here
RPC_URL=https://sepolia.infura.io/v3/your_infura_project_id_here
PRIVATE_KEY=0x...your_private_key_here
CONTRACT_ADDRESS=  # Will be set after deployment
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_secret
```

### 3. Deploy Smart Contract

```bash
# Make sure you're at repository root
npx hardhat run scripts/deploy.js --network sepolia
```

**Important**: Copy the deployed contract address from the output and add it to `api/.env` as `CONTRACT_ADDRESS=0x...`

### 4. Run Backend Server

```bash
cd api
go run ./cmd/server
```

The server will start on `http://localhost:8080` and display configuration status.

### 5. Test the System

```bash
# Test health endpoint
curl http://localhost:8080/health

# Upload a manifest
curl -X POST http://localhost:8080/upload \
  -H "Content-Type: application/json" \
  -d '{
    "image_cid": "QmTest123",
    "creator": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "prompt": "A beautiful sunset over mountains",
    "model": "DALL-E 3",
    "origin": "https://example.com",
    "timestamp": 1704067200
  }'
```

Expected response:
```json
{
  "cid": "Qm...",
  "txHash": "0x...",
  "etherscan": "https://sepolia.etherscan.io/tx/0x...",
  "manifest": {...}
}
```

## Verification

1. **Check Pinata**: Visit `https://gateway.pinata.cloud/ipfs/{cid}` to see the pinned manifest
2. **Check Etherscan**: Visit the `etherscan` URL from the response to see the on-chain transaction
3. **Check Contract**: Visit `https://sepolia.etherscan.io/address/{CONTRACT_ADDRESS}` to see the deployed contract

## Troubleshooting

### "abi.json not found"
- Make sure you've deployed the contract first: `npx hardhat run scripts/deploy.js --network sepolia`
- The ABI should be written to `api/internal/eth/abi.json` automatically

### "Pinata not configured"
- Check that `PINATA_API_KEY` and `PINATA_API_SECRET` are set in `api/.env`
- Get credentials from https://pinata.cloud

### "Ethereum not configured"
- Check that `RPC_URL`, `PRIVATE_KEY`, and `CONTRACT_ADDRESS` are set in `api/.env`
- Make sure you have Sepolia testnet ETH in the wallet

### "insufficient funds"
- Get Sepolia ETH from https://sepoliafaucet.com/
- Make sure the `PRIVATE_KEY` corresponds to a wallet with Sepolia ETH

## Architecture Overview

1. **Frontend/Client** → Sends manifest JSON to `/upload`
2. **Backend** → Pins manifest to Pinata (IPFS) → Gets CID
3. **Backend** → Calls Ethereum contract `storeManifest(cid)` → Gets TX hash
4. **Response** → Returns CID, TX hash, and Etherscan link

## Key Files

- `contracts/ImageProvenance.sol` - Smart contract
- `scripts/deploy.js` - Deployment script
- `api/internal/eth/eth.go` - Ethereum integration
- `api/internal/pinata/pinata.go` - Pinata IPFS integration
- `api/internal/handlers/handlers.go` - HTTP handlers
- `api/cmd/server/main.go` - Server entry point

## Support

For issues, check:
- README.md for detailed documentation
- Server logs for error messages
- Etherscan for transaction status
- Pinata dashboard for IPFS status
