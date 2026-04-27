const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const trustedForwarder = ethers.ZeroAddress; // Replace with actual forwarder address in production
  
  // Deploy ChainStreamNFT
  const ChainStreamNFT = await ethers.getContractFactory("ChainStreamNFT");
  const nft = await ChainStreamNFT.deploy(deployer.address, trustedForwarder);

  await nft.waitForDeployment();

  const nftAddress = await nft.getAddress();
  console.log("ChainStreamNFT deployed to:", nftAddress);

  // Deploy Subscription Contract
  const ChainStreamSubscription = await ethers.getContractFactory("ChainStreamSubscription");
  const subscription = await ChainStreamSubscription.deploy(trustedForwarder);
  await subscription.waitForDeployment();
  const subAddress = await subscription.getAddress();
  console.log("ChainStreamSubscription deployed to:", subAddress);

  // Save the contract address and ABI to the frontend
  const contractsDir = path.join(__dirname, "..", "src", "lib", "blockchain", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  const contractData = {
    address: nftAddress,
    abi: JSON.parse(nft.interface.formatJson()),
  };

  fs.writeFileSync(
    path.join(contractsDir, "ChainStreamNFT.json"),
    JSON.stringify(contractData, null, 2)
  );

  const subData = {
    address: subAddress,
    abi: JSON.parse(subscription.interface.formatJson()),
  };

  fs.writeFileSync(
    path.join(contractsDir, "ChainStreamSubscription.json"),
    JSON.stringify(subData, null, 2)
  );

  console.log("Contract data saved to frontend.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
