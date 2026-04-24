const { ethers } = require("hardhat");
const ChainStreamSubscription = require("../src/lib/blockchain/contracts/ChainStreamSubscription.json");

async function main() {
  const adminAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"; // Hardhat Account #19
  console.log("Transferring ownership to Admin:", adminAddress);

  // Deployer (Account #0) is the current owner
  const [deployer] = await ethers.getSigners();
  console.log("Current Signer (Deployer):", deployer.address);

  const contract = await ethers.getContractAt(
    ChainStreamSubscription.abi,
    ChainStreamSubscription.address,
    deployer
  );

  const currentOwner = await contract.owner();
  console.log("Current Contract Owner:", currentOwner);

  if (currentOwner.toLowerCase() === adminAddress.toLowerCase()) {
    console.log("Admin is already the owner.");
    return;
  }

  console.log("Executing transferOwnership...");
  const tx = await contract.transferOwnership(adminAddress);
  await tx.wait();

  const newOwner = await contract.owner();
  console.log("New Contract Owner:", newOwner);
  console.log("Success! Account #19 can now execute payouts.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
