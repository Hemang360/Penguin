# Proof-of-Art (cDNA)

End-to-end scaffold for the cDNA framework: backend (Go + Echo), frontend (React + Vite + Tailwind), and a Chrome extension (TypeScript + Vite).

## Prereqs
- Go 1.22+
- Node 20+
- pnpm or npm
- Chrome/Chromium for the extension

## Backend
```bash
cd api
# one time
go mod tidy

# live reload
air
# API at http://localhost:8787
```

### Endpoints
- POST `/ext/push` – receive prompt data from extension
- POST `/node` – create signed node (manual)
- POST `/artifact` – upload media (multipart: file, nodeId)
- POST `/finalize` – build manifest from node/artifact keys
- GET `/verify?key=/ipfs/<key>` – verify signature

Data is stored in a mocked IPFS DB in-memory and written to `storage/` for artifacts/manifests.

## Frontend
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

Pages: Dashboard, Verify. Verify allows checking a stored `/ipfs/...` key via backend.

## Extension
```bash
cd extension
npm install
npm run build
# Load dist/ as unpacked extension (MV3)
```

- Captures prompt inputs and submits; sends events to backend `/ext/push`.
- Toggle capture from popup.

## Notes
- Crypto: Ed25519 signatures (detached JWS-like), BLAKE3 for node hashing, SHA-256 for artifacts.
- Replace `internal/ipfsdb` with real IPFS later via `go-ipfs-api`.

## Roadmap
- Session graph UI
- Perceptual hash (pHash) for images
- Real IPFS storage
- Embedded watermarking/manifest
```

