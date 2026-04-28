import { ethers } from 'ethers';
import ChainStreamNFT from './contracts/ChainStreamNFT.json';

export const mintNFT = async (
  signer: ethers.Signer,
  to: string,
  tokenId: string,
  amount: number,
  uri: string,
  royaltyFee: number = 500, // default 5%
  price: number = 0 // default free
) => {
  try {
    const contract = new ethers.Contract(
      ChainStreamNFT.address,
      ChainStreamNFT.abi,
      signer
    );

    const tx = await contract.mint(
      to, 
      tokenId, 
      amount, 
      uri, 
      Math.floor(royaltyFee), 
      ethers.parseEther(price.toString()),
      {
        gasLimit: 500000 
      }
    );
    const receipt = await tx.wait();
    
    return receipt;
  } catch (error) {
    console.error('Minting error:', error);
    throw error;
  }
};
