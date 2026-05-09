'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useChainId, useWriteContract, useSwitchChain } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { config } from '@/providers/Web3Provider';
import Button from '@/components/ui/Button';
import { 
  Coins, 
  Calendar, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  History,
  LayoutDashboard,
  Wallet,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { getProvider, getSigner } from '@/lib/blockchain/provider';
import { ethers, Contract } from 'ethers';
import ChainStreamSubscription from '@/lib/blockchain/contracts/ChainStreamSubscription.json';
import ChainStreamNFT from '@/lib/blockchain/contracts/ChainStreamNFT.json';
import WalletConnect from '@/components/web3/WalletConnect';

interface Settlement {
  id: string;
  totalPool: number;
  totalStreams: number;
  processedAt: string;
  _count: { settlements: number };
}

interface ArtistSettlement {
  id: string;
  artistId: string;
  payoutAmount: number;
  streamsCount: number;
  isPaid: boolean;
  artist: {
    address: string;
    payoutAddress: string | null;
    name: string | null;
  };
}

interface RoyaltyStats {
  royaltyPoolBalance: string;
  platformProfits: string;
  platformEarnings: string;
  platformFeePercent: string;
  lastSettlementDate: string | null;
  pendingSettlementsCount: number;
  contractOwner: string;
  platformRevenueBreakdown: any[];
  isDue: boolean;
  history: Settlement[];
}

export default function RoyaltiesPage() {
  const [stats, setStats] = useState<RoyaltyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [payoutData, setPayoutData] = useState<{ 
    artists: string[], 
    amounts: string[], 
    tokenIds: string[],
    count: number, 
    rawSettlements: ArtistSettlement[] 
  } | null>(null);
  const [contractOwner, setContractOwner] = useState<string | null>(null);

  const { address: connectedAddress, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const targetChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '6343');
  const isWrongNetwork = chainId !== targetChainId;

  const [mounted, setMounted] = useState(false);

  const fetchStats = async () => {
    try {
      console.log("[RoyaltiesPage] Fetching stats...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const resp = await fetch('/api/admin/royalties/stats', { 
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await resp.json();
      if (data.success && data.stats.contractOwner) {
        setStats(data.stats);
        setContractOwner(data.stats.contractOwner);
      } else {
        console.error("API error or missing owner:", data.error);
        // Secondary fallback to known developer wallet if API fails
        setContractOwner("0x047DF2c5Dd11BC7579E53800B1b6E54c6414826f");
      }
    } catch (e) {
      console.error("Error fetching royalty stats:", e);
      // Secondary fallback to known developer wallet if API fails
      setContractOwner("0x047DF2c5Dd11BC7579E53800B1b6E54c6414826f");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchStats();
  }, []);

  if (!mounted) return null;

  const handleSettle = async () => {
    if (!confirm('This will aggregate all unsettled streams and calculate the current royalty split. Procced?')) return;
    
    setActionLoading(true);
    try {
      const resp = await fetch('/api/admin/royalties/settle', { method: 'POST' });
      const data = await resp.json();
      if (data.success) {
        alert(`Settlement successful! ${data.settlement.artistSettlements} artists updated.`);
        fetchStats();
      } else {
        alert(`Error: ${data.error || 'Failed to settle'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error during settlement');
    } finally {
      setActionLoading(false);
    }
  };

  const preparePayout = async () => {
    setActionLoading(true);
    try {
      const resp = await fetch('/api/admin/royalties/payout');
      const data = await resp.json();
      if (data.success) {
        setPayoutData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const executePayout = async () => {
    if (!payoutData || payoutData.count === 0) return;
    
    setActionLoading(true);
    try {
      const signer = await getSigner();
      const contract = new Contract(
        ChainStreamSubscription.address,
        ChainStreamSubscription.abi,
        signer
      );

      console.log("Executing payout for:", payoutData.artists, payoutData.amounts, payoutData.tokenIds);
      
      const tx = await contract.payoutRoyalties(payoutData.artists, payoutData.amounts, payoutData.tokenIds);
      alert(`Transaction submitted: ${tx.hash}. Waiting for confirmation...`);
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        // Mark settlements as paid in DB
        await fetch('/api/admin/royalties/payout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txHash: tx.hash,
            settlementIds: payoutData.rawSettlements.map((s) => s.id)
          })
        });
        
        alert('On-chain payout and database update completed successfully!');
        setPayoutData(null);
        fetchStats();
      }
    } catch (e: any) {
      console.error(e);
      alert(`Payout failed: ${e.message || 'Check console'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawProtocolFees = async () => {
    if (!isConnected || isWrongNetwork) return;
    try {
      const hash = await writeContractAsync({
        address: ChainStreamNFT.address as `0x${string}`,
        abi: ChainStreamNFT.abi,
        functionName: 'withdrawFees',
      });
      await waitForTransactionReceipt(config, { hash });
      alert('Protocol fees successfully withdrawn to your wallet!');
    } catch (e: any) {
      alert(`Withdrawal failed: ${e.message}`);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '10rem' }}><Loader2 className="animate-spin text-primary" size={48} /></div>;

  return (
    <div className="royalties-page animate-fade-in">
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Dyllicit Royalty Hub</h1>
            <p>Calculate, settle, and execute streaming payments to platform artists.</p>
          </div>
          <Button variant="outline" onClick={handleWithdrawProtocolFees} disabled={isWrongNetwork}>
            <ShieldCheck size={18} />
            Withdraw Minting Fees
          </Button>
        </div>
      </div>

      {stats?.isDue && (
        <div className="alert warning glass">
          <AlertCircle size={20} />
          <div>
            <strong>Monthly Payment Due</strong>
            <p>It's been over 30 days since the last settlement. Please review and process payouts.</p>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="stat-card glass">
          <div className="stat-icon"><Coins /></div>
          <div className="stat-content">
            <span className="label">Royalty Pool (Payout Balance)</span>
            <span className="value">{stats?.royaltyPoolBalance || '0.0'} ETH</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon" style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}><Wallet /></div>
          <div className="stat-content">
            <span className="label">Platform Profits (NFT Contract)</span>
            <span className="value">{stats?.platformProfits || '0.0'} ETH</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon"><Calendar /></div>
          <div className="stat-content">
            <span className="label">Last Distribution</span>
            <span className="value">
              {stats?.lastSettlementDate ? new Date(stats.lastSettlementDate).toLocaleDateString() : 'Never'}
            </span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon"><LayoutDashboard /></div>
          <div className="stat-content">
            <span className="label">Pending Payouts</span>
            <span className="value">{stats?.pendingSettlementsCount} Records</span>
          </div>
        </div>

        <div className="stat-card glass full-width-card">
          <div className="stat-icon"><Wallet /></div>
          <div className="stat-content">
            <span className="value" style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>
              {contractOwner && contractOwner !== "Unknown" 
                ? `${contractOwner.slice(0, 10)}...${contractOwner.slice(-8)}` 
                : (contractOwner === "Unknown" ? "Could not fetch owner" : 'Loading...')}
            </span>
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                Connected: {connectedAddress ? `${connectedAddress.slice(0, 10)}...${connectedAddress.slice(-8)}` : 'Not Connected'}
              </div>
              
              {!isConnected ? (
                <div style={{ marginTop: '0.5rem' }}>
                  <WalletConnect fullWidth={false} />
                </div>
              ) : (
                <>
                  {contractOwner && connectedAddress && connectedAddress.toLowerCase() === contractOwner.toLowerCase() ? (
                    <span className="status-badge success" style={{ fontSize: '0.7rem' }}>✓ Authorized Wallet Connected</span>
                  ) : (
                    <span className="status-badge warning" style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                      ⚠ Switch to Owner Wallet to execute payouts
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="actions-section">
        <div className="action-card glass">
          <h2>1. Settlement Calculation</h2>
          <p>Scan for all unsettled stream logs and distribute the current contract pool proportionally among artists.</p>
          <Button 
            variant="primary" 
            onClick={handleSettle} 
            disabled={actionLoading}
          >
            {actionLoading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
            Calculate & Settle Balances
          </Button>
        </div>

        <div className="action-card glass">
          <h2>2. On-Chain Execution</h2>
          <p>Finalize the batch payout by sending ETH from the smart contract to artist wallets.</p>
          {!payoutData ? (
             <Button 
               variant="secondary" 
               onClick={preparePayout} 
               disabled={actionLoading || stats?.pendingSettlementsCount === 0}
             >
               {actionLoading ? <Loader2 className="animate-spin" /> : <Wallet />}
               Prepare Batch Payout
             </Button>
          ) : (
            <div className="payout-review">
              <div className="review-stats">
                <span><strong>{payoutData.count}</strong> Artists</span>
                <span><strong>Summary Ready</strong></span>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button variant="outline" onClick={handleWithdrawProtocolFees} disabled={isWrongNetwork}>
                  <ShieldCheck size={18} />
                  Withdraw Minting Fees
                </Button>
                <Button variant="primary" onClick={executePayout} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                  Confirm & Sign Transaction
                </Button>
              </div>
              <button className="text-btn" onClick={() => setPayoutData(null)}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Platform Revenue Breakdown */}
      <div className="history-section animate-fade-in" style={{ marginTop: '2rem' }}>
        <div className="section-header">
          <RefreshCw size={20} />
          <h2>Platform Revenue Tracking</h2>
        </div>
        <div className="glass" style={{ padding: '1rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem', opacity: 0.5, fontSize: '0.8rem' }}>TRANSACTION</th>
                <th style={{ padding: '1rem', opacity: 0.5, fontSize: '0.8rem' }}>TYPE</th>
                <th style={{ padding: '1rem', opacity: 0.5, fontSize: '0.8rem' }}>SOURCE</th>
                <th style={{ padding: '1rem', opacity: 0.5, fontSize: '0.8rem' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {stats?.platformRevenueBreakdown?.map((fee: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>
                    <a href={`https://carrot.megaeth.com/tx/${fee.transactionHash}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>
                      {fee.transactionHash.slice(0, 10)}...
                    </a>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`status-badge ${fee.type === 'MINT' ? 'success' : 'primary'}`} style={{ fontSize: '0.7rem' }}>
                      {fee.type}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.8rem', opacity: 0.6 }}>{fee.from.slice(0, 10)}...</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{fee.amount} ETH</td>
                </tr>
              ))}
              {(!stats?.platformRevenueBreakdown || stats.platformRevenueBreakdown.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', opacity: 0.5, fontStyle: 'italic' }}>
                    No platform fees recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="history-section">
        <div className="section-header">
          <History size={20} />
          <h2>Settlement History</h2>
        </div>
        <div className="history-table glass">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Pool Size</th>
                <th>Streams</th>
                <th>Recipients</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats?.history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.processedAt).toLocaleString()}</td>
                  <td>{h.totalPool} ETH</td>
                  <td>{h.totalStreams}</td>
                  <td>{h._count.settlements} Artists</td>
                  <td><span className="status-badge success">Settled</span></td>
                </tr>
              ))}
              {stats?.history.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', opacity: 0.5 }}>No history records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .royalties-page { display: flex; flex-direction: column; gap: 2rem; }
        .header h1 { margin: 0 0 0.5rem; letter-spacing: -1px; }
        .header p { opacity: 0.6; margin: 0; }
        
        .alert { 
          display: flex; gap: 1rem; padding: 1.5rem; border-radius: 1rem; align-items: flex-start;
          border: 1px solid rgba(245, 158, 11, 0.2); background: rgba(245, 158, 11, 0.05);
        }
        .alert.warning { color: #f59e0b; }
        .alert p { margin: 0.25rem 0 0; font-size: 0.9rem; opacity: 0.8; }

        .dashboard-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .stat-card { padding: 1.5rem; border-radius: 1rem; display: flex; align-items: center; gap: 1.25rem; }
        .stat-icon { width: 48px; height: 48px; border-radius: 12px; background: rgba(139, 92, 246, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; }
        .stat-content { display: flex; flex-direction: column; }
        .stat-content .label { font-size: 0.8rem; opacity: 0.6; }
        .stat-content .value { font-size: 1.25rem; font-weight: 700; }
        .full-width-card { grid-column: span 4; }

        .actions-section { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .action-card { padding: 2rem; border-radius: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .action-card h2 { margin: 0; font-size: 1.15rem; }
        .action-card p { margin: 0; font-size: 0.9rem; opacity: 0.6; line-height: 1.5; }
        
        .payout-review { 
          background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 1rem; 
          display: flex; flex-direction: column; gap: 1rem; border: 1px dashed rgba(255,255,255,0.1);
        }
        .review-stats { display: flex; justify-content: space-between; font-size: 0.9rem; }
        .text-btn { background: none; border: none; color: white; opacity: 0.5; cursor: pointer; font-size: 0.85rem; }
        .text-btn:hover { opacity: 1; }

        .history-section { display: flex; flex-direction: column; gap: 1rem; }
        .section-header { display: flex; align-items: center; gap: 0.75rem; opacity: 0.8; }
        .section-header h2 { font-size: 1.15rem; margin: 0; }
        
        .history-table { border-radius: 1.25rem; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; text-align: left; }
        th { padding: 1rem 1.5rem; font-size: 0.85rem; opacity: 0.5; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.05); }
        td { padding: 1.25rem 1.5rem; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
        tr:last-child td { border-bottom: none; }
        
        .status-badge { padding: 0.25rem 0.75rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 600; }
        .status-badge.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }

        .loading-container { display: flex; justify-content: center; align-items: center; min-height: 400px; }
      `}</style>
    </div>
  );
}
