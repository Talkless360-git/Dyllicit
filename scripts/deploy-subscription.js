const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("Deploying ChainStreamSubscription...");

  const Subscription = await ethers.getContractFactory("ChainStreamSubscription");
  const subscription = await Subscription.deploy();

  await subscription.waitForDeployment();
  const address = await subscription.getAddress();

  console.log(`ChainStreamSubscription deployed to: ${address}`);

  // Update frontend JSON
  const contractsDir = path.join(__dirname, "..", "src", "lib", "blockchain", "contracts");
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "ChainStreamSubscription.sol", "ChainStreamSubscription.json");
  
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const config = {
    address: address,
    abi: artifact.abi
  };

  const filePath = path.join(contractsDir, "ChainStreamSubscription.json");
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  console.log(`Updated frontend config at: ${filePath}`);

  // Auto-transfer ownership if ADMIN_WALLET_ADDRESS is in .env
  const adminAddress = process.env.ADMIN_WALLET_ADDRESS;
  if (adminAddress && adminAddress.toLowerCase() !== address.toLowerCase()) {
    console.log(`Transferring ownership to configured admin: ${adminAddress}`);
    try {
      const tx = await subscription.transferOwnership(adminAddress);
      await tx.wait();
      console.log("Ownership transferred successfully.");
    } catch (e) {
      console.error("Failed to transfer ownership:", e.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
