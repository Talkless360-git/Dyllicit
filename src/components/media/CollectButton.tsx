'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { Wallet, Loader2, CheckCircle, ShoppingBag } from 'lucide-react';
import { useWriteContract, useAccount, useChainId, useSwitchChain } from 'wagmi';
import { parseEther } from 'viem';
import { waitForTransactionReceipt } from '@wagmi/core';
import { config } from '@/providers/Web3Provider';
import NFTABI from "@/lib/blockchain/contracts/ChainStreamNFT.json";

interface CollectButtonProps {
  mediaId: string;
  tokenId: string;
  price: number;
  isOwned?: boolean;
}

export default function CollectButton({ mediaId, tokenId, price, isOwned = false }: CollectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { isConnected, address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const targetChainId = 6343; // MegaETH Carrot

  const handleCollect = async () => {
    if (!isConnected) {
      alert("Please connect your wallet to collect this NFT.");
      return;
    }

    if (chainId !== targetChainId) {
      switchChain?.({ chainId: targetChainId });
      return;
    }

    setLoading(true);
    try {
      const hash = await writeContractAsync({
        address: NFTABI.address as `0x${string}`,
        abi: NFTABI.abi,
        functionName: 'purchase',
        args: [BigInt(tokenId)],
        value: parseEther(price.toString())
      });

      await waitForTransactionReceipt(config, { hash });
      
      // Update local state
      setSuccess(true);
      
      // Sync collection with database
      await fetch('/api/nft/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId, ownerAddress: address })
      });

    } catch (e: any) {
      console.error(e);
      alert(`Collection failed: ${e.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (success || isOwned) {
    return (
      <div className="collect-success glass animate-fade-in" style={{ padding: '0.75rem 1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--success)', background: 'rgba(16, 185, 129, 0.1)', minWidth: '200px', justifyContent: 'center' }}>
        <CheckCircle size={20} color="#10b981" />
        <span style={{ fontWeight: 'bold', color: '#10b981' }}>{isOwned ? 'Owned' : 'Collected!'}</span>
      </div>
    );
  }

  return (
    <Button 
      variant="primary" 
      size="lg" 
      onClick={handleCollect} 
      disabled={loading || price === 0}
      style={{ minWidth: '200px' }}
    >
      {loading ? <Loader2 size={20} className="animate-spin" /> : <ShoppingBag size={20} />}
      {loading ? 'Processing...' : `Collect NFT (${price} ETH)`}
    </Button>
  );
}
