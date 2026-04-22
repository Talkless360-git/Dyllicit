/**
 * IPFS Utility for ChainStream
 * 
 * Handles resolution of IPFS hashes, ipfs:// protocols, and full URLs 
 * to the configured Pinata Gateway.
 */

const DEFAULT_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export const getIPFSUrl = (path: string | null | undefined): string => {
  if (!path) return "";
  
  // 1. If it's already a full HTTP URL (not IPFS), return it as is
  if (path.startsWith('http') && !path.includes('ipfs')) {
    return path;
  }

  // 2. Extract the CID/Hash
  let hash = path;
  if (path.startsWith('ipfs://')) {
    hash = path.replace('ipfs://', '');
  } else if (path.includes('/ipfs/')) {
    hash = path.split('/ipfs/').pop() || path;
  }

  // 3. Resolve with Gateway
  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;
  
  if (!gateway) {
    return `${DEFAULT_GATEWAY}/${hash}`;
  }

  // Format custom gateway
  let formattedGateway = gateway.startsWith('http') ? gateway : `https://${gateway}`;
  if (formattedGateway.endsWith('/')) {
    formattedGateway = formattedGateway.slice(0, -1);
  }
  
  // Ensure the /ipfs/ suffix exists if it's a standard gateway
  if (!formattedGateway.includes('/ipfs')) {
    formattedGateway = `${formattedGateway}/ipfs`;
  }

  return `${formattedGateway}/${hash}`;
};

/**
 * Placeholder logic for redacted content
 */
export const getRedactedMessage = () => "Unlock this content with a subscription or NFT ownership.";
