'use client';

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
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
  Wallet
} from 'lucide-react';
import { getProvider, getSigner } from '@/lib/blockchain/provider';
import { ethers, Contract } from 'ethers';
import ChainStreamSubscription from '@/lib/blockchain/contracts/ChainStreamSubscription.json';

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
  contractBalance: string;
  platformEarnings: string;
  platformFeePercent: string;
  lastSettlementDate: string | null;
  pendingSettlementsCount: number;
  isDue: boolean;
  history: Settlement[];
}

export default function RoyaltiesPage() {
  const [stats, setStats] = useState<RoyaltyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [payoutData, setPayoutData] = useState<{ artists: string[], amounts: string[], count: number, rawSettlements: ArtistSettlement[] } | null>(null);
  const [contractOwner, setContractOwner] = useState<string | null>(null);

  const { address: connectedAddress } = useAccount();

  const fetchStats = async () => {
    try {
      const resp = await fetch('/api/admin/royalties/stats');
      const data = await resp.json();
      if (data.success) {
        setStats(data.stats);
      }
      
      // Also fetch contract owner for UI guidance
      const signer = await getSigner();
      const contract = new Contract(
        ChainStreamSubscription.address,
        ChainStreamSubscription.abi,
        signer
      );
      const owner = await contract.owner();
      setContractOwner(owner);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

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

      console.log("Executing payout for:", payoutData.artists, payoutData.amounts);
      
      const tx = await contract.payoutRoyalties(payoutData.artists, payoutData.amounts);
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

  if (loading) return <div className="loading-container"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="royalties-page animate-fade-in">
      <div className="header">
        <h1>Dyllicit Royalty Hub</h1>
        <p>Calculate, settle, and execute streaming payments to platform artists.</p>
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
            <span className="label">Royalty Pool Balance</span>
            <span className="value">{stats?.contractBalance} ETH</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon" style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}><Wallet /></div>
          <div className="stat-content">
            <span className="label">Platform Earnings ({stats?.platformFeePercent || '2.5'}%)</span>
            <span className="value">{stats?.platformEarnings} ETH</span>
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
            <span className="label">Contract Owner (Required for Payouts)</span>
            <span className="value" style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>
              {contractOwner ? `${contractOwner.slice(0, 10)}...${contractOwner.slice(-8)}` : 'Loading...'}
            </span>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {connectedAddress?.toLowerCase() === contractOwner?.toLowerCase() ? (
                <span className="status-badge success" style={{ fontSize: '0.7rem' }}>✓ Authorized Wallet Connected</span>
              ) : (
                <span className="status-badge warning" style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  ⚠ Switch to Owner Wallet to execute payouts
                </span>
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
              <Button variant="primary" onClick={executePayout} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                Confirm & Sign Transaction
              </Button>
              <button className="text-btn" onClick={() => setPayoutData(null)}>Cancel</button>
            </div>
          )}
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
