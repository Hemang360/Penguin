const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying ImageProvenance contract to Sepolia...");

  // Get the contract factory
  const ImageProvenance = await hre.ethers.getContractFactory("ImageProvenance");
  
  // Deploy the contract
  const imageProvenance = await ImageProvenance.deploy();
  
  // Wait for deployment
  await imageProvenance.waitForDeployment();
  
  const contractAddress = await imageProvenance.getAddress();
  console.log("\n✅ ImageProvenance deployed to:", contractAddress);
  console.log("📝 Copy this address to api/.env as CONTRACT_ADDRESS\n");

  // Get contract ABI
  const contractArtifact = await hre.artifacts.readArtifact("ImageProvenance");
  const abi = contractArtifact.abi;

  // Create eth directory if it doesn't exist
  const ethDir = path.join(__dirname, "..", "api", "internal", "eth");
  if (!fs.existsSync(ethDir)) {
    fs.mkdirSync(ethDir, { recursive: true });
  }

  // Write ABI to api/internal/eth/abi.json
  const abiPath = path.join(ethDir, "abi.json");
  fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
  console.log("✅ ABI written to:", abiPath);

  // Write contract address to api/internal/eth/contract_address.txt
  const addressPath = path.join(ethDir, "contract_address.txt");
  fs.writeFileSync(addressPath, contractAddress);
  console.log("✅ Contract address written to:", addressPath);

  // Also write to .env format for easy copy-paste
  console.log("\n📋 Add this to your api/.env file:");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log("\n🔗 View on Etherscan:");
  console.log(`https://sepolia.etherscan.io/address/${contractAddress}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

