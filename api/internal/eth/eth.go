package eth

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// ContractABI is the ABI for the ImageProvenance contract
// This will be loaded from abi.json file
var ContractABI string

// LoadABI loads the ABI from the abi.json file
func LoadABI() error {
	// Try multiple possible paths
	possiblePaths := []string{
		"api/internal/eth/abi.json",
		"internal/eth/abi.json",
		"./api/internal/eth/abi.json",
		"../api/internal/eth/abi.json",
	}

	var abiPath string
	var found bool
	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			abiPath = path
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("abi.json not found in any of: %v. Please deploy the contract first using: npx hardhat run scripts/deploy.js --network sepolia", possiblePaths)
	}

	data, err := os.ReadFile(abiPath)
	if err != nil {
		return fmt.Errorf("failed to read ABI file: %w", err)
	}

	ContractABI = string(data)
	return nil
}

// StoreManifest stores a manifest CID on Ethereum Sepolia
func StoreManifest(ctx context.Context, rpcURL, privateKeyHex, contractAddress, cid string) (string, error) {
	// Load ABI if not already loaded
	if ContractABI == "" {
		if err := LoadABI(); err != nil {
			return "", err
		}
	}

	// Connect to Ethereum client
	client, err := ethclient.DialContext(ctx, rpcURL)
	if err != nil {
		return "", fmt.Errorf("failed to connect to Ethereum client: %w", err)
	}
	defer client.Close()

	// Parse private key
	privateKey, err := crypto.HexToECDSA(strings.TrimPrefix(privateKeyHex, "0x"))
	if err != nil {
		return "", fmt.Errorf("invalid private key: %w", err)
	}

	// Get public key and address
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", fmt.Errorf("error casting public key to ECDSA")
	}

	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	// Get nonce
	nonce, err := client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get nonce: %w", err)
	}

	// Get gas price
	gasPrice, err := client.SuggestGasPrice(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get gas price: %w", err)
	}

	// Get chain ID
	chainID, err := client.NetworkID(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get chain ID: %w", err)
	}

	// Parse contract ABI
	contractABI, err := abi.JSON(strings.NewReader(ContractABI))
	if err != nil {
		return "", fmt.Errorf("failed to parse contract ABI: %w", err)
	}

	// Encode function call: storeManifest(string)
	data, err := contractABI.Pack("storeManifest", cid)
	if err != nil {
		return "", fmt.Errorf("failed to pack function call: %w", err)
	}

	// Create transaction
	toAddress := common.HexToAddress(contractAddress)
	
	// Estimate gas
	gasLimit, err := client.EstimateGas(ctx, ethereum.CallMsg{
		From:  fromAddress,
		To:    &toAddress,
		Data:  data,
		Value: big.NewInt(0),
	})
	if err != nil {
		// Use a default gas limit if estimation fails
		gasLimit = 200000
		log.Printf("Warning: gas estimation failed, using default: %d", gasLimit)
	}

	// Add 20% buffer to gas limit
	gasLimit = gasLimit + (gasLimit * 20 / 100)

	tx := types.NewTransaction(nonce, toAddress, big.NewInt(0), gasLimit, gasPrice, data)

	// Sign transaction
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return "", fmt.Errorf("failed to create transactor: %w", err)
	}

	signedTx, err := auth.Signer(auth.From, tx)
	if err != nil {
		return "", fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Send transaction
	err = client.SendTransaction(ctx, signedTx)
	if err != nil {
		return "", fmt.Errorf("failed to send transaction: %w", err)
	}

	txHash := signedTx.Hash().Hex()
	log.Printf("✅ Transaction submitted: %s", txHash)
	log.Printf("🔗 View on Etherscan: https://sepolia.etherscan.io/tx/%s", txHash)

	return txHash, nil
}

// GetContractABI returns the contract ABI as a JSON string
func GetContractABI() (string, error) {
	if ContractABI == "" {
		if err := LoadABI(); err != nil {
			return "", err
		}
	}
	return ContractABI, nil
}

// ParseABI parses the ABI JSON and returns the abi.ABI object
func ParseABI() (*abi.ABI, error) {
	if ContractABI == "" {
		if err := LoadABI(); err != nil {
			return nil, err
		}
	}
	
	contractABI, err := abi.JSON(strings.NewReader(ContractABI))
	if err != nil {
		return nil, fmt.Errorf("failed to parse ABI: %w", err)
	}
	
	return &contractABI, nil
}

// ManifestStoredEvent represents the ManifestStored event
type ManifestStoredEvent struct {
	Creator   common.Address
	CID       string
	Timestamp *big.Int
}

// ParseManifestStoredEvent parses a ManifestStored event from transaction logs
func ParseManifestStoredEvent(logData []byte, topics []common.Hash) (*ManifestStoredEvent, error) {
	contractABI, err := ParseABI()
	if err != nil {
		return nil, err
	}

	event := new(ManifestStoredEvent)
	err = contractABI.UnpackIntoInterface(event, "ManifestStored", logData)
	if err != nil {
		return nil, fmt.Errorf("failed to unpack event: %w", err)
	}

	// Parse indexed parameters from topics
	if len(topics) >= 2 {
		event.Creator = common.HexToAddress(topics[1].Hex())
	}

	return event, nil
}

