import { ethers } from 'ethers';

export const getProvider = () => {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return new ethers.BrowserProvider((window as any).ethereum);
  }
  
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  
  // If no RPC URL is provided and we aren't in a browser, we shouldn't attempt to connect
  // to a default local node unless we are sure one is running.
  if (!rpcUrl) {
    console.warn("NEXT_PUBLIC_RPC_URL is not defined. Blockchain features may be unavailable.");
    return null;
  }

  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '31337');
  const networkName = chainId === 6343 ? 'megaeth-carrot' : 'localhost';

  return new ethers.JsonRpcProvider(
    rpcUrl,
    {
      chainId: chainId,
      name: networkName
    },
    { staticNetwork: true }
  );
};

export const getSigner = async () => {
  const provider = getProvider();
  if (provider instanceof ethers.BrowserProvider) {
    const network = await provider.getNetwork();
    const expectedChainId = BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || '31337');
    
    if (network.chainId !== expectedChainId) {
      // Trigger a network switch
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
          try {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${expectedChainId.toString(16)}`,
                  chainName: 'MegaETH Carrot',
                  rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL || 'https://carrot.megaeth.com/rpc'],
                  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                  blockExplorerUrls: ['https://carrot.megaeth.com']
                },
              ],
            });
          } catch (addError) {
            throw new Error("Failed to add MegaETH Carrot to MetaMask. Please add it manually.");
          }
        } else {
          throw new Error(`Please switch your MetaMask network to MegaETH Carrot (Chain ID: ${expectedChainId})`);
        }
      }
    }
    
    return await provider.getSigner();
  }
  throw new Error('No compatible wallet found for signing. Please install MetaMask.');
};
