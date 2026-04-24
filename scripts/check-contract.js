const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const contractPath = path.join(__dirname, '../src/lib/blockchain/contracts/ChainStreamSubscription.json');
  const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  
  const contract = new ethers.Contract(contractData.address, contractData.abi, provider);
  
  console.log('--- Contract Audit ---');
  console.log('Target Address:', contractData.address);
  
  try {
    const code = await provider.getCode(contractData.address);
    if (code === '0x') {
      console.log('❌ NO CONTRACT DEPLOYED AT THIS ADDRESS.');
      return;
    }

    const feeBps = await contract.platformFeeBps();
    const price = await contract.subscriptionPrice();
    const balance = await provider.getBalance(contractData.address);
    const owner = await contract.owner();
    
    console.log('✅ Contract found!');
    console.log('Owner:', owner);
    console.log('Platform Fee (BPS):', feeBps.toString(), `(${feeBps.toString()/100}%)`);
    console.log('Subscription Price:', ethers.formatEther(price), 'ETH');
    console.log('Current Contract Balance:', ethers.formatEther(balance), 'ETH');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

main();
