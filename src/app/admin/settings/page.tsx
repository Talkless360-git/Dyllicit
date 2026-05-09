'use client';

import React, { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { Loader2, Percent, Share2, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { useWriteContract, useAccount, useReadContract, useChainId, useSwitchChain, useWalletClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { waitForTransactionReceipt } from '@wagmi/core';
import { config } from '@/providers/Web3Provider';
import SubscriptionABI from "@/lib/blockchain/contracts/ChainStreamSubscription.json";
import NFTABI from "@/lib/blockchain/contracts/ChainStreamNFT.json";
import WalletConnect from '@/components/web3/WalletConnect';

export default function AdminSettingsPage() {
  const [formData, setFormData] = useState({ 
    platformFee: 2.5, 
    defaultRoyalty: 5.0, 
    subscriptionFee: 0.01,
    platformMintingFee: 0
  });
  const [loading, setLoading] = useState(true);
  const [syncingField, setSyncingField] = useState<string | null>(null);

  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const targetChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '6343');
  const isWrongNetwork = chainId !== targetChainId;

  // 1. Fetch from Database first
  useEffect(() => {
    const fetchDbSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.settings) {
          setFormData({
            platformFee: data.settings.platformFee,
            defaultRoyalty: data.settings.defaultRoyalty,
            subscriptionFee: data.settings.subscriptionFee,
            platformMintingFee: data.settings.platformMintingFee || 0
          });
        }
      } catch (e) {
        console.warn("Could not fetch DB settings:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDbSettings();
  }, []);

  // 2. Read from blockchain (overlay)
  const { data: onChainPrice, refetch: refetchPrice } = useReadContract({
    address: SubscriptionABI.address as `0x${string}`,
    abi: SubscriptionABI.abi,
    functionName: 'subscriptionPrice',
    query: { enabled: !isWrongNetwork }
  });

  const { data: onChainPlatformFee, refetch: refetchFee } = useReadContract({
    address: SubscriptionABI.address as `0x${string}`,
    abi: SubscriptionABI.abi,
    functionName: 'platformFeeBps',
    query: { enabled: !isWrongNetwork }
  });

  const { data: onChainRoyalty, refetch: refetchRoyalty } = useReadContract({
    address: NFTABI.address as `0x${string}`,
    abi: NFTABI.abi,
    functionName: 'globalRoyaltyBps',
    query: { enabled: !isWrongNetwork }
  });

  const { data: onChainMintingFee, refetch: refetchMintingFee } = useReadContract({
    address: NFTABI.address as `0x${string}`,
    abi: NFTABI.abi,
    functionName: 'platformMintingFee',
    query: { enabled: !isWrongNetwork }
  });
  
  const { refetch: refetchNFTAddr } = useReadContract({
    address: SubscriptionABI.address as `0x${string}`,
    abi: SubscriptionABI.abi,
    functionName: 'nftContract',
    query: { enabled: !isWrongNetwork }
  });

  const { isConnected, address: connectedAccount } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const syncDatabase = async (newData: any) => {
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, ...newData })
      });
    } catch (e) {
      console.warn("Database sync failed:", e);
    }
  };

  const syncPlatformFee = async () => {
    if (!isConnected || isWrongNetwork) return;
    setSyncingField('platformFee');
    try {
      const platformBps = Math.round(formData.platformFee * 100);
      const hash = await writeContractAsync({
        address: SubscriptionABI.address as `0x${string}`,
        abi: SubscriptionABI.abi,
        functionName: 'setPlatformFee',
        args: [BigInt(platformBps)],
        gas: 200000n, // Hardcoded gas to avoid estimation errors on flaky RPC
      });
      await waitForTransactionReceipt(config, { hash });
      await refetchFee();
      await syncDatabase({ platformFee: formData.platformFee });
      alert('Platform Fee synchronized!');
    } catch (e: any) {
      alert(`Sync failed: ${e.message}`);
    } finally {
      setSyncingField(null);
    }
  };

  const syncSubscriptionFee = async () => {
    if (!isConnected || isWrongNetwork) return;
    setSyncingField('subscriptionFee');
    try {
      const hash = await writeContractAsync({
        address: SubscriptionABI.address as `0x${string}`,
        abi: SubscriptionABI.abi,
        functionName: 'setPrice',
        args: [parseEther(formData.subscriptionFee.toString())],
        gas: 200000n,
      });
      await waitForTransactionReceipt(config, { hash });
      await refetchPrice();
      await syncDatabase({ subscriptionFee: formData.subscriptionFee });
      alert('Subscription Fee synchronized!');
    } catch (e: any) {
      alert(`Sync failed: ${e.message}`);
    } finally {
      setSyncingField(null);
    }
  };

  const syncDefaultRoyalty = async () => {
    if (!isConnected || isWrongNetwork) return;
    setSyncingField('defaultRoyalty');
    try {
      const royaltyBps = Math.round(formData.defaultRoyalty * 100);
      const hash = await writeContractAsync({
        address: NFTABI.address as `0x${string}`,
        abi: NFTABI.abi,
        functionName: 'setGlobalRoyalty',
        args: [BigInt(royaltyBps)],
        gas: 200000n,
      });
      await waitForTransactionReceipt(config, { hash });
      await refetchRoyalty();
      await syncDatabase({ defaultRoyalty: formData.defaultRoyalty });
      alert('Default Royalty synchronized!');
    } catch (e: any) {
      alert(`Sync failed: ${e.message}`);
    } finally {
      setSyncingField(null);
    }
  };
  
  const syncPlatformMintingFee = async () => {
    if (!isConnected || isWrongNetwork || !walletClient) {
      console.warn("[Sync Abort Details]:", { isConnected, isWrongNetwork, walletClientReady: !!walletClient });
      return;
    }
    
    setSyncingField('platformMintingFee');
    try {
      console.log("[Sync] Initiating Platform Minting Fee update...");
      
      const hash = await walletClient.writeContract({
        address: NFTABI.address as `0x${string}`,
        abi: NFTABI.abi,
        functionName: 'setPlatformMintingFee',
        args: [parseEther(formData.platformMintingFee.toString())],
        account: connectedAccount as `0x${string}`,
        gas: 200000n,
      });

      console.log("[Sync] Transaction sent, hash:", hash);
      await waitForTransactionReceipt(config, { hash });
      
      console.log("[Sync] Transaction confirmed, refetching...");
      await refetchMintingFee();
      await syncDatabase({ platformMintingFee: formData.platformMintingFee });
      alert('Platform Minting Fee synchronized!');
    } catch (e: any) {
      console.error("[Sync] Blockchain failure:", e);
      alert(`Sync failed: ${e.message}`);
    } finally {
      setSyncingField(null);
    }
  };

  const syncNFTContract = async () => {
    if (!isConnected || isWrongNetwork) return;
    setSyncingField('nftContract');
    try {
      const hash = await writeContractAsync({
        address: SubscriptionABI.address as `0x${string}`,
        abi: SubscriptionABI.abi,
        functionName: 'setNFTContract',
        args: [NFTABI.address as `0x${string}`],
      });
      await waitForTransactionReceipt(config, { hash });
      await refetchNFTAddr();
      alert('NFT Contract link synchronized!');
    } catch (e: any) {
      alert(`Sync failed: ${e.message}`);
    } finally {
      setSyncingField(null);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '10rem' }}><Loader2 className="animate-spin text-primary" size={48} /></div>;

  return (
    <div className="admin-settings animate-fade-in">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Protocol Configuration</h1>
          <p>Manage platform-wide financial rates and smart contract configurations.</p>
        </div>
        <div className="glass" style={{ padding: '0.5rem', borderRadius: '0.75rem' }}>
          <WalletConnect fullWidth={false} />
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        {isWrongNetwork && isConnected && (
          <div className="network-warning glass" style={{ 
            border: '2px solid #ef4444', 
            background: 'rgba(239, 68, 68, 0.1)', 
            padding: '1.5rem',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)',
            animation: 'pulse 2s infinite'
          }}>
            <AlertTriangle size={24} color="#ef4444" />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Wrong Network Detected</strong>
              <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>The admin controls are locked until you switch to the <strong>MegaETH Carrot</strong> network.</span>
            </div>
            <Button variant="primary" size="sm" onClick={() => switchChain?.({ chainId: targetChainId })} style={{ background: '#ef4444' }}>
              Switch to MegaETH
            </Button>
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
            <button 
              className="individual-sync" 
              onClick={syncPlatformFee} 
              disabled={syncingField !== null || isWrongNetwork}
              title="Sync to Blockchain"
            >
              {syncingField === 'platformFee' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
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
            <button 
              className="individual-sync" 
              onClick={syncSubscriptionFee} 
              disabled={syncingField !== null || isWrongNetwork}
              title="Sync to Blockchain"
            >
              {syncingField === 'subscriptionFee' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
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
            <button 
              className="individual-sync" 
              onClick={syncDefaultRoyalty} 
              disabled={syncingField !== null || isWrongNetwork}
              title="Sync to Blockchain"
            >
              {syncingField === 'defaultRoyalty' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
          </div>
          <p className="hint">The default royalty pool allocated to creators for streaming their content.</p>
        </div>

        <div className="form-group">
          <div className="label-row">
            <label>Platform Minting Fee (ETH)</label>
            <div className="on-chain-badge">
              <ShieldCheck size={12} />
              <span>Live: {onChainMintingFee !== undefined ? formatEther(onChainMintingFee as bigint) : '--'} ETH</span>
            </div>
          </div>
          <div className="input-with-icon">
            <input 
              type="number" 
              step="0.0001" 
              value={formData.platformMintingFee}
              onChange={(e) => setFormData({...formData, platformMintingFee: parseFloat(e.target.value)})}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', paddingRight: '0.5rem' }}>ETH</span>
            <button 
              className="individual-sync" 
              onClick={() => {
                console.log("Syncing Platform Minting Fee...");
                syncPlatformMintingFee();
              }} 
              disabled={syncingField !== null || isWrongNetwork}
              title={isWrongNetwork ? "Switch to MegaETH to Sync" : "Sync to Blockchain"}
              style={{ opacity: isWrongNetwork ? 0.3 : 1 }}
            >
              {syncingField === 'platformMintingFee' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
          </div>
          <p className="hint">The flat fee creators pay to the platform for each new track uploaded.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2.5rem' }}>
          <Button 
            variant="secondary" 
            onClick={() => syncDatabase(formData).then(() => alert('Local database updated!'))}
            fullWidth
            disabled={syncingField !== null}
          >
            <ShieldCheck size={16} /> Save Changes to Local Database
          </Button>

          <div className="admin-extra-tools">
            <label style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '0.5rem', display: 'block' }}>Contract Maintenance</label>
            <Button variant="outline" onClick={syncNFTContract} disabled={syncingField !== null || isWrongNetwork} fullWidth>
              {syncingField === 'nftContract' ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
              Sync NFT Contract Link
            </Button>
          </div>
        </div>
        
        <div className="security-footer">
          <ShieldCheck size={16} className="text-primary" />
          <p>
            <strong>Dual-Sync Strategy:</strong> Settings are synced both to the Local Database (for fast UI rendering) and Smart Contracts (for financial authority).
            If a blockchain sync fails, you can still update the local database to keep the dashboard functional.
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

        .individual-sync {
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          color: var(--primary);
          padding: 0.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 0.5rem;
        }

        .individual-sync:hover:not(:disabled) {
          background: var(--primary);
          color: white;
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
        }

        .individual-sync:disabled {
          opacity: 0.3;
          cursor: not-allowed;
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

