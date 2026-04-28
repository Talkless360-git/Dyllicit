'use client';

import React, { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { Loader2, Percent, Share2, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { useWriteContract, useAccount, useReadContract, useChainId, useSwitchChain } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { waitForTransactionReceipt } from '@wagmi/core';
import { config } from '@/providers/Web3Provider';
import SubscriptionABI from "@/lib/blockchain/contracts/ChainStreamSubscription.json";
import NFTABI from "@/lib/blockchain/contracts/ChainStreamNFT.json";

export default function AdminSettingsPage() {
  const [formData, setFormData] = useState({ platformFee: 2.5, defaultRoyalty: 5.0, subscriptionFee: 0.01 });
  const [loading, setLoading] = useState(true);
  const [syncStep, setSyncStep] = useState<number>(0); // 0: idle, 1: price, 2: fee, 3: royalty

  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const targetChainId = 6343; // MegaETH Carrot
  const isWrongNetwork = chainId !== targetChainId;

  // Read from blockchain
  const { data: onChainPrice, refetch: refetchPrice } = useReadContract({
    address: SubscriptionABI.address as `0x${string}`,
    abi: SubscriptionABI.abi,
    functionName: 'subscriptionPrice',
  });

  const { data: onChainPlatformFee, refetch: refetchFee } = useReadContract({
    address: SubscriptionABI.address as `0x${string}`,
    abi: SubscriptionABI.abi,
    functionName: 'platformFeeBps',
  });

  const { data: onChainRoyalty, refetch: refetchRoyalty } = useReadContract({
    address: NFTABI.address as `0x${string}`,
    abi: NFTABI.abi,
    functionName: 'globalRoyaltyBps',
  });

  useEffect(() => {
    if (onChainPrice !== undefined && onChainPlatformFee !== undefined && onChainRoyalty !== undefined) {
      setFormData({
        subscriptionFee: parseFloat(formatEther(onChainPrice as bigint)),
        platformFee: Number(onChainPlatformFee) / 100, // bps to %
        defaultRoyalty: Number(onChainRoyalty) / 100, // bps to %
      });
      setLoading(false);
    } else {
      const timer = setTimeout(() => setLoading(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [onChainPrice, onChainPlatformFee, onChainRoyalty]);

  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [syncing, setSyncing] = useState(false);

  const handleSyncOnChain = async () => {
    if (!isConnected) {
      alert("Please connect your admin wallet first.");
      return;
    }
    if (isWrongNetwork) {
      alert("Please switch to MegaETH Carrot network first.");
      switchChain?.({ chainId: targetChainId });
      return;
    }

    setSyncing(true);
    try {
      // 1. Sync Price
      setSyncStep(1);
      const hash1 = await writeContractAsync({
        address: SubscriptionABI.address as `0x${string}`,
        abi: SubscriptionABI.abi,
        functionName: 'setPrice',
        args: [parseEther(formData.subscriptionFee.toString())],
      });
      await waitForTransactionReceipt(config, { hash: hash1 });
      await refetchPrice();

      // 2. Sync Platform Fee (bps)
      setSyncStep(2);
      const platformBps = Math.round(formData.platformFee * 100);
      const hash2 = await writeContractAsync({
        address: SubscriptionABI.address as `0x${string}`,
        abi: SubscriptionABI.abi,
        functionName: 'setPlatformFee',
        args: [BigInt(platformBps)],
      });
      await waitForTransactionReceipt(config, { hash: hash2 });
      await refetchFee();

      // 3. Sync Default Royalty (bps)
      setSyncStep(3);
      const royaltyBps = Math.round(formData.defaultRoyalty * 100);
      const hash3 = await writeContractAsync({
        address: NFTABI.address as `0x${string}`,
        abi: NFTABI.abi,
        functionName: 'setGlobalRoyalty',
        args: [BigInt(royaltyBps)],
      });
      await waitForTransactionReceipt(config, { hash: hash3 });
      await refetchRoyalty();

      setSyncStep(0);
      alert('All settings successfully synchronized with the blockchain!');
    } catch (e: any) {
      console.error(e);
      alert(`On-chain sync failed: ${e.message || 'Unknown error'}`);
    } finally {
      setSyncing(false);
      setSyncStep(0);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '10rem' }}><Loader2 className="animate-spin text-primary" size={48} /></div>;

  return (
    <div className="admin-settings animate-fade-in">
      <div className="header">
        <h1>Protocol Configuration</h1>
        <p>Manage platform-wide financial rates and smart contract configurations.</p>
        
        {isWrongNetwork && isConnected && (
          <div className="network-warning glass">
            <AlertTriangle size={20} color="#ea384c" />
            <span>Wrong Network: Please switch to <strong>MegaETH Carrot</strong> to manage settings.</span>
            <Button variant="outline" size="sm" onClick={() => switchChain?.({ chainId: targetChainId })}>Switch Network</Button>
          </div>
        )}
      </div>

      <div className="settings-container glass-premium">
        <div className="form-group">
          <div className="label-row">
            <label>Platform Fee (%)</label>
            <div className="on-chain-badge">
              <ShieldCheck size={12} />
              <span>Live: {onChainPlatformFee !== undefined ? (Number(onChainPlatformFee) / 100).toFixed(2) : '--'}%</span>
            </div>
          </div>
          <div className="input-with-icon">
            <input 
              type="number" 
              step="0.01" 
              value={formData.platformFee}
              onChange={(e) => setFormData({...formData, platformFee: parseFloat(e.target.value)})}
            />
            <Percent size={16} />
          </div>
          <p className="hint">The percentage of every subscription or NFT sale retained by the platform.</p>
        </div>

        <div className="form-group">
          <div className="label-row">
            <label>Monthly Subscription Fee (ETH)</label>
            <div className="on-chain-badge">
              <ShieldCheck size={12} />
              <span>Live: {onChainPrice !== undefined ? formatEther(onChainPrice as bigint) : '--'} ETH</span>
            </div>
          </div>
          <div className="input-with-icon">
            <input 
              type="number" 
              step="0.001" 
              value={formData.subscriptionFee}
              onChange={(e) => setFormData({...formData, subscriptionFee: parseFloat(e.target.value)})}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', paddingRight: '0.5rem' }}>ETH</span>
          </div>
          <p className="hint">The price users pay to unlock premium features and support artists.</p>
        </div>

        <div className="form-group">
          <div className="label-row">
            <label>Default Creator Royalty (%)</label>
            <div className="on-chain-badge">
              <ShieldCheck size={12} />
              <span>Live: {onChainRoyalty !== undefined ? (Number(onChainRoyalty) / 100).toFixed(2) : '--'}%</span>
            </div>
          </div>
          <div className="input-with-icon">
            <input 
              type="number" 
              step="0.01" 
              value={formData.defaultRoyalty}
              onChange={(e) => setFormData({...formData, defaultRoyalty: parseFloat(e.target.value)})}
            />
            <Percent size={16} />
          </div>
          <p className="hint">The default royalty pool allocated to creators for streaming their content.</p>
        </div>

        <div className="button-group" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2.5rem' }}>
          <Button variant="primary" onClick={handleSyncOnChain} disabled={syncing || isWrongNetwork} fullWidth>
            {syncing ? <RefreshCw size={18} className="animate-spin" /> : <Share2 size={18} />}
            {syncing ? `Updating Step ${syncStep}/3...` : 'Sync Settings to Blockchain'}
          </Button>
          
          {syncing && (
            <div className="sync-status animate-pulse">
              <p>Please confirm all 3 transactions in your wallet. Waiting for on-chain confirmation...</p>
            </div>
          )}
        </div>
        
        <div className="security-footer">
          <ShieldCheck size={16} className="text-primary" />
          <p>
            <strong>Trustless Configuration:</strong> Settings are stored directly in the smart contracts on MegaETH Carrot. 
            No centralized database is used for financial rules.
          </p>
        </div>
      </div>

      <style jsx>{`
        .admin-settings {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }
        .header { margin-bottom: 3rem; }
        .header h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 0.5rem; }
        .header p { opacity: 0.6; font-size: 1.1rem; }
        
        .network-warning {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.5rem;
          margin-top: 1.5rem;
          border: 1px solid rgba(234, 56, 76, 0.3);
          background: rgba(234, 56, 76, 0.05);
          border-radius: 1rem;
          color: #ff6b6b;
        }

        .settings-container {
          padding: 3rem;
          border-radius: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
        }
        
        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .on-chain-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(139, 92, 246, 0.15);
          color: var(--primary);
          padding: 0.25rem 0.75rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 700;
          border: 1px solid rgba(139, 92, 246, 0.2);
        }

        .form-group {
          margin-bottom: 2rem;
        }
        
        label { font-size: 1rem; font-weight: 600; opacity: 0.9; }
        .hint { font-size: 0.85rem; opacity: 0.4; margin-top: 0.5rem; }

        .input-with-icon {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.75rem;
          padding-right: 1.25rem;
          transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .input-with-icon:focus-within { 
          border-color: var(--primary);
          background: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
        }

        .input-with-icon input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          padding: 1rem 1.25rem;
          outline: none;
          font-size: 1.1rem;
          font-weight: 500;
        }

        .sync-status {
          text-align: center;
          color: var(--primary);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .security-footer {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }
        
        .security-footer p {
          font-size: 0.85rem;
          opacity: 0.5;
          margin: 0;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

