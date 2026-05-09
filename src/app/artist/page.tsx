'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Play, 
  Music, 
  TrendingUp, 
  Plus, 
  Users,
  Clock,
  Wallet
} from 'lucide-react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatEther } from 'viem';
import ChainStreamSubscriptionABI from '@/lib/blockchain/contracts/ChainStreamSubscription.json';

interface ArtistStats {
  totalStreams: number;
  totalMedia: number;
  royaltyBalance: number;
  payoutAddress?: string;
  recentStreams: any[];
  totalSharesSold?: number;
  totalSalesRevenue?: number;
}

export default function ArtistDashboard() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  const { data: pendingOnChainData, refetch: refetchOnChain } = useReadContract({
    address: ChainStreamSubscriptionABI.address as `0x${string}`,
    abi: ChainStreamSubscriptionABI.abi,
    functionName: 'pendingRoyalties',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });
  
  const pendingOnChain = pendingOnChainData ? Number(formatEther(pendingOnChainData as bigint)) : 0;

  const [stats, setStats] = useState<ArtistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutStatus, setPayoutStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [payoutMessage, setPayoutMessage] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = () => {
    fetch('/api/artist/stats', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        console.log("Fetched stats:", data);
        if (data.success) {
          setStats(data.stats);
        }
        setLoading(false);
      });
  };

  const handlePayout = async () => {
    setPayoutStatus('pending');
    try {
      const res = await fetch('/api/artist/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setPayoutStatus('success');
        const msg = `Payout of ${data.payoutAmount.toFixed(4)} ETH requested successfully! Your royalties are accrued and waiting for the next batch distribution.`;
        setPayoutMessage(msg);
        alert(msg);
        fetchStats(); // Refresh stats
      } else {
        setPayoutStatus('error');
        setPayoutMessage(data.error);
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      setPayoutStatus('error');
      setPayoutMessage('Failed to request payout');
      alert('Failed to request payout');
    }
  };

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      const tx = await writeContractAsync({
        address: ChainStreamSubscriptionABI.address as `0x${string}`,
        abi: ChainStreamSubscriptionABI.abi,
        functionName: 'withdrawRoyalties',
      });
      alert(`Withdrawal submitted! TX Hash: ${tx}`);
      refetchOnChain();
    } catch (error: any) {
      console.error(error);
      alert(`Withdrawal failed: ${error.message}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (loading) return <div className="loading-state">Accessing Studio...</div>;

  return (
    <div className="artist-dashboard animate-fade-in">
      <div className="welcome-section">
        <div className="welcome-text">
          <h1>Creator Studio</h1>
          <p>Your performance at a glance.</p>
        </div>
        <Link href="/mint">
          <button className="upload-btn-lg">
            <Plus size={20} />
            <span>Upload New Content</span>
          </button>
        </Link>
      </div>

      <div className="metrics-grid">
        <div className="metric-card glass">
          <div className="metric-header">
            <Play size={24} color="var(--primary)" />
            <span>Total streams</span>
          </div>
          <div className="metric-value">{stats?.totalStreams || 0}</div>
          <div className="metric-footer">+12% from last week</div>
        </div>

        <div className="metric-card glass">
          <div className="metric-header">
            <Music size={24} color="#10b981" />
            <span>Active Tracks</span>
          </div>
          <div className="metric-value">{stats?.totalMedia || 0}</div>
          <div className="metric-footer">Publicly streaming</div>
        </div>

        <div className="metric-card glass">
          <div className="metric-header">
            <TrendingUp size={24} color="#3b82f6" />
            <span>Royalty Balance</span>
          </div>
          
          {/* Off-Chain Pending Balance */}
          <div className="metric-value">{(stats?.royaltyBalance || 0).toFixed(4)} ETH</div>
          <div className="metric-footer">
            Off-chain accrued (Waiting for Admin Batch Payout)
          </div>
          {stats?.payoutAddress && stats.royaltyBalance >= 0.005 && (
            <button 
              className="payout-btn"
              onClick={handlePayout}
              disabled={payoutStatus === 'pending'}
              style={{ marginBottom: '1rem' }}
            >
              {payoutStatus === 'pending' ? 'Processing...' : 'Request Admin Settlement'}
            </button>
          )}

          {/* On-Chain Ready Balance */}
          <div className="metric-value" style={{ marginTop: '1rem', color: '#10b981' }}>{pendingOnChain.toFixed(4)} ETH</div>
          <div className="metric-footer" style={{ color: '#10b981' }}>
            Ready to withdraw on-chain!
          </div>
          {pendingOnChain > 0 && (
            <button 
              className="payout-btn"
              onClick={handleWithdraw}
              disabled={isWithdrawing}
              style={{ background: '#10b981' }}
            >
              {isWithdrawing ? 'Withdrawing...' : 'Withdraw to Wallet'}
            </button>
          )}
        </div>

        <div className="metric-card glass">
          <div className="metric-header">
            <Users size={24} color="#8b5cf6" />
            <span>NFT Shares Sold</span>
          </div>
          <div className="metric-value">{stats?.totalSharesSold || 0}</div>
          <div className="metric-footer">Direct purchases by fans</div>
        </div>

        <div className="metric-card glass">
          <div className="metric-header">
            <Wallet size={24} color="#f59e0b" />
            <span>NFT Sales Revenue</span>
          </div>
          <div className="metric-value">{(stats?.totalSalesRevenue || 0).toFixed(4)} ETH</div>
          <div className="metric-footer">Earnings from direct sales</div>
        </div>
      </div>

      {payoutMessage && (
        <div className={`payout-message ${payoutStatus}`}>
          {payoutMessage}
        </div>
      )}

      <div className="recent-activity-section">
        <div className="section-title">
          <Clock size={20} />
          <h2>Recent Activity</h2>
        </div>
        
        <div className="activity-list glass">
          {stats?.recentStreams.map((stream, idx) => (
            <div key={idx} className="activity-item">
              <div className="activity-icon">
                <Play size={16} />
              </div>
              <div className="activity-details">
                <p>New stream on <strong>{stream.media.title}</strong></p>
                <span>{new Date(stream.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {(!stats?.recentStreams || stats.recentStreams.length === 0) && (
            <div className="empty-state">No stream data available yet. Share your tracks!</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .loading-state {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 50vh;
          font-size: 1.25rem;
          opacity: 0.5;
        }
        .welcome-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4rem;
        }
        .welcome-text h1 {
          font-size: 3rem;
          background: linear-gradient(135deg, white 0%, #aaa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }
        .welcome-text p {
          font-size: 1.1rem;
          opacity: 0.5;
        }
        .upload-btn-lg {
          background: var(--primary);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 3rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: var(--transition);
          box-shadow: 0 10px 20px rgba(139, 92, 246, 0.3);
        }
        .upload-btn-lg:hover {
          transform: translateY(-2px);
          background: var(--primary-hover);
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-bottom: 4rem;
        }
        .metric-card {
          padding: 2rem;
        }
        .metric-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.9rem;
          font-weight: 600;
          opacity: 0.6;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 1.5rem;
        }
        .metric-value {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }
        .metric-footer {
          font-size: 0.85rem;
          opacity: 0.4;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
          color: var(--primary);
        }
        .activity-list {
          padding: 1rem;
        }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.25rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .activity-item:last-child {
          border-bottom: none;
        }
        .activity-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(139, 92, 246, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }
        .activity-details p {
          margin: 0;
          font-size: 0.95rem;
        }
        .activity-details span {
          font-size: 0.8rem;
          opacity: 0.4;
        }
        .payout-btn {
          background: var(--primary);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 1rem;
          transition: var(--transition);
        }
        .payout-btn:hover:not(:disabled) {
          background: var(--primary-hover);
        }
        .payout-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .payout-message {
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 2rem;
          font-weight: 500;
        }
        .payout-message.success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .payout-message.error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .payout-message.pending {
          background: rgba(139, 92, 246, 0.1);
          color: var(--primary);
          border: 1px solid rgba(139, 92, 246, 0.2);
        }
      `}</style>
    </div>
  );
}
