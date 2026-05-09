import { ethers } from 'ethers';
import ChainStreamNFT from './contracts/ChainStreamNFT.json';

export const verifyNFTOwnership = async (
  userAddress: string, 
  tokenId: string, 
  rpcUrl: string = 'http://127.0.0.1:8545'
): Promise<boolean> => {
  try {
    const rpc = rpcUrl || process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpc) {
      console.warn("No RPC URL available for NFT ownership verification");
      return false;
    }

    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '31337');
    const networkName = chainId === 6343 ? 'megaeth-carrot' : 'localhost';

    const provider = new ethers.JsonRpcProvider(
      rpc,
      {
        chainId: chainId,
        name: networkName
      },
      { staticNetwork: true }
    );
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

export const verifyTransaction = async (
  txHash: string,
  expectedFrom?: string,
  rpcUrl: string = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545'
): Promise<{ success: boolean; receipt?: ethers.TransactionReceipt }> => {
  try {
    const rpc = rpcUrl || process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpc) {
      console.warn("No RPC URL available for transaction verification");
      return { success: false };
    }

    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '31337');
    const networkName = chainId === 6343 ? 'megaeth-carrot' : 'localhost';

    const provider = new ethers.JsonRpcProvider(
      rpc,
      {
        chainId: chainId,
        name: networkName
      },
      { staticNetwork: true }
    );
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return { success: false };
    }

    // Check if the transaction was successful (status 1)
    if (receipt.status !== 1) {
      return { success: false, receipt };
    }

    // If expectedFrom is provided, verify the sender
    if (expectedFrom && receipt.from.toLowerCase() !== expectedFrom.toLowerCase()) {
      return { success: false, receipt };
    }

    return { success: true, receipt };
  } catch (error) {
    console.error('Transaction verification error:', error);
    return { success: false };
  }
};
