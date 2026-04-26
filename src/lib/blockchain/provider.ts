import { ethers } from 'ethers';

export const getProvider = () => {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return new ethers.BrowserProvider((window as any).ethereum);
  }
  return new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545');
};

export const getSigner = async () => {
  const provider = getProvider();
  if (provider instanceof ethers.BrowserProvider) {
    const network = await provider.getNetwork();
    const expectedChainId = BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || '31337');
    
    if (network.chainId !== expectedChainId) {
      // Trigger a network switch if possible
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
        });
      } catch (switchError: any) {
        const networkName = expectedChainId === BigInt(6343) ? "MegaETH Carrot" : "the required network";
        throw new Error(`Please switch your MetaMask network to ${networkName} (Chain ID: ${expectedChainId})`);
      }
    }
    
    return await provider.getSigner();
  }
  throw new Error('No compatible wallet found for signing. Please install MetaMask.');
};
