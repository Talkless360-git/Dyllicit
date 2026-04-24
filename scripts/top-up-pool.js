const { ethers } = require("hardhat");
const ChainStreamSubscription = require("../src/lib/blockchain/contracts/ChainStreamSubscription.json");

async function main() {
  const [deployer] = await ethers.getSigners();
  const amount = ethers.parseEther("0.1");
  
  console.log(`Depositing ${ethers.formatEther(amount)} ETH to subscription contract...`);
  
  const tx = await deployer.sendTransaction({
    to: ChainStreamSubscription.address,
    value: amount
  });
  
  await tx.wait();
  console.log("Success! Contract topped up.");
}

main().catch(console.error);
