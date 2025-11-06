require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Extract Infura project ID from RPC_URL if available, otherwise use INFURA_PROJECT_ID
function getInfuraProjectId() {
  // First, try to extract from RPC_URL if it exists
  if (process.env.RPC_URL) {
    const match = process.env.RPC_URL.match(/\/v3\/([^\/\s]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  // Fall back to INFURA_PROJECT_ID
  if (process.env.INFURA_PROJECT_ID) {
    // Remove any whitespace or newlines that might have been introduced
    return process.env.INFURA_PROJECT_ID.trim();
  }
  throw new Error("INFURA_PROJECT_ID or RPC_URL with project ID must be set in .env");
}

// Get private key, ensuring it starts with 0x if not already
function getPrivateKey() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY must be set in .env");
  }
  const key = process.env.PRIVATE_KEY.trim();
  return key.startsWith("0x") ? key : `0x${key}`;
}

const infuraProjectId = getInfuraProjectId();
const privateKey = getPrivateKey();

console.log("Using Infura Project ID:", infuraProjectId.substring(0, 10) + "...");
console.log("Using account:", privateKey.substring(0, 10) + "..." + privateKey.substring(privateKey.length - 8));

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${infuraProjectId}`,
      accounts: [privateKey],
      chainId: 11155111,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

