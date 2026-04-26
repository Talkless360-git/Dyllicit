import { ethers } from 'ethers';
import ChainStreamNFT from './contracts/ChainStreamNFT.json';

export const verifyNFTOwnership = async (
  userAddress: string, 
  tokenId: string, 
  rpcUrl: string = 'http://127.0.0.1:8545'
): Promise<boolean> => {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(
      ChainStreamNFT.address,
      ChainStreamNFT.abi,
      provider
    );

    const balance = await contract.balanceOf(userAddress, tokenId);
    return balance > BigInt(0);
  } catch (error) {
    console.error('Ownership verification error:', error);
    return false;
  }
};
