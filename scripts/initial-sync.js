const { ethers } = require("hardhat");
const NFTABI = require("../src/lib/blockchain/contracts/ChainStreamNFT.json");
const SubscriptionABI = require("../src/lib/blockchain/contracts/ChainStreamSubscription.json");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Syncing initial settings with deployer:", deployer.address);

  const nft = await ethers.getContractAt("ChainStreamNFT", NFTABI.address);
  const sub = await ethers.getContractAt("ChainStreamSubscription", SubscriptionABI.address);

  // 1. Link NFT to Subscription
  console.log("Setting NFT contract in Subscription...");
  const tx1 = await sub.setNFTContract(NFTABI.address);
  await tx1.wait();

  // 2. Set Platform Fee (2.5%)
  console.log("Setting platform fee to 2.5% (250 bps)...");
  const tx2 = await sub.setPlatformFee(250);
  await tx2.wait();

  // 3. Set Global Royalty (5%)
  console.log("Setting global royalty to 5% (500 bps)...");
  const tx3 = await nft.setGlobalRoyalty(500);
  await tx3.wait();

  // 4. Set Initial Subscription Price (0.01 ETH)
  console.log("Setting subscription price to 0.01 ETH...");
  const tx4 = await sub.setPrice(ethers.parseEther("0.01"));
  await tx4.wait();

  console.log("Initial settings successfully synchronized on-chain.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
