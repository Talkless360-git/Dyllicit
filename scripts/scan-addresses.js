const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  
  const addresses = [
    '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    '0x9fE46736679d2d9a65F0992F2272dE9f3c7fa6e0',
    '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
  ];

  for (const addr of addresses) {
    const code = await provider.getCode(addr);
    const balance = await provider.getBalance(addr);
    console.log(`Address: ${addr}`);
    console.log(`  Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`  Code: ${code === '0x' ? 'None' : 'CONTRACT EXISTS'}`);
  }
}

main();
