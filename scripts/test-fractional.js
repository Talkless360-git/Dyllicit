const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, artist, fan] = await ethers.getSigners();
  
  // Deploy locally for testing
  const ChainStreamNFT = await ethers.getContractFactory("ChainStreamNFT");
  const nft = await ChainStreamNFT.deploy(deployer.address, ethers.ZeroAddress);
  await nft.waitForDeployment();
  
  console.log("Deployed ChainStreamNFT at:", nft.target);
  
  // 1. Mint 100 shares as an artist
  const tokenId = 999;
  const totalShares = 100;
  const mintPrice = ethers.parseEther("0.001"); // Price per share
  
  console.log(`\nArtist (${artist.address}) minting ${totalShares} shares for token ${tokenId}...`);
  
  // Minting fee is 0, so no value needed. 
  // signature: mint(address account, uint256 id, uint256 amount, string memory uri, uint96 royaltyFee, uint256 price)
  let tx = await nft.connect(artist).mint(
    artist.address, 
    tokenId, 
    totalShares, 
    "ipfs://test", 
    500, // 5% royalty
    mintPrice
  );
  await tx.wait();
  
  let artistBalance = await nft.balanceOf(artist.address, tokenId);
  console.log(`Artist balance after mint: ${artistBalance.toString()}`);
  
  // 2. Fan purchases 1 share
  console.log(`\nFan (${fan.address}) purchasing 1 share for ${ethers.formatEther(mintPrice)} ETH...`);
  
  tx = await nft.connect(fan).purchase(tokenId, { value: mintPrice });
  await tx.wait();
  
  artistBalance = await nft.balanceOf(artist.address, tokenId);
  let fanBalance = await nft.balanceOf(fan.address, tokenId);
  let supply = await nft["totalSupply(uint256)"](tokenId);
  
  console.log(`Artist balance after purchase: ${artistBalance.toString()}`);
  console.log(`Fan balance after purchase: ${fanBalance.toString()}`);
  console.log(`Total Supply: ${supply.toString()}`);
  
  if (artistBalance.toString() === "99" && fanBalance.toString() === "1" && supply.toString() === "100") {
    console.log("\n✅ SUCCESS: Fractional ownership logic works perfectly! Supply didn't inflate.");
  } else {
    console.log("\n❌ FAILED: Balances or supply are incorrect.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
