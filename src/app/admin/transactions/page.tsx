'use client';

import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Coins, 
  ExternalLink, 
  ArrowUpRight, 
  User, 
  Music,
  Calendar,
  Wallet
} from 'lucide-react';

interface Subscription {
  id: string;
  tier: string;
  txnHash: string | null;
  createdAt: string;
  user: {
    address: string;
    name: string | null;
    email: string | null;
  };
}

interface RoyaltyDistribution {
  id: string;
  payoutAmount: number;
  streamsCount: number;
  createdAt: string;
  artist: {
    address: string;
    name: string | null;
  };
  royaltySettlement: {
    totalPool: number;
    processedAt: string;
  };
}

export default function AdminTransactions() {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'royalties'>('subscriptions');
  const [data, setData] = useState<{ subscriptions: Subscription[], royaltyDistributions: RoyaltyDistribution[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/transactions')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setData({
            subscriptions: data.subscriptions,
            royaltyDistributions: data.royaltyDistributions
          });
        }
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading-state">Syncing Ledger...</div>;

  return (
    <div className="transactions-page animate-fade-in">
      <header className="page-header">
        <div className="header-text">
          <h1>Transaction History</h1>
          <p>Comprehensive ledger of platform subscriptions and royalty payouts.</p>
        </div>
        <div className="tab-switcher glass">
          <button 
            className={activeTab === 'subscriptions' ? 'active' : ''} 
            onClick={() => setActiveTab('subscriptions')}
          >
            <CreditCard size={18} />
            Subscriptions
          </button>
          <button 
            className={activeTab === 'royalties' ? 'active' : ''} 
            onClick={() => setActiveTab('royalties')}
          >
            <Coins size={18} />
            Royalty Distribution
          </button>
        </div>
      </header>

      <div className="content-wrapper">
        {activeTab === 'subscriptions' ? (
          <section className="transaction-section glass">
            <div className="table-responsive">
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subscriber</th>
                    <th>Wallet Address</th>
                    <th>Tier</th>
                    <th>Transaction Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.subscriptions.map(sub => (
                    <tr key={sub.id}>
                      <td className="date-cell">
                        <Calendar size={14} className="icon" />
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="user-cell">
                        <div className="user-info">
                          <span className="name">{sub.user.name || 'Anonymous'}</span>
                          <span className="email">{sub.user.email || 'No email'}</span>
                        </div>
                      </td>
                      <td className="wallet-cell">
                        <code>{sub.user.address.slice(0, 8)}...{sub.user.address.slice(-6)}</code>
                        <a href={`https://sepolia.basescan.org/address/${sub.user.address}`} target="_blank" rel="noreferrer">
                          <ExternalLink size={12} />
                        </a>
                      </td>
                      <td>
                        <span className="badge tier-badge">{sub.tier.toUpperCase()}</span>
                      </td>
                      <td className="hash-cell">
                        {sub.txnHash ? (
                          <a href={`https://sepolia.basescan.org/tx/${sub.txnHash}`} target="_blank" rel="noreferrer" className="hash-link">
                            {sub.txnHash.slice(0, 10)}...
                            <ArrowUpRight size={14} />
                          </a>
                        ) : (
                          <span className="muted">On-chain pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!data?.subscriptions || data.subscriptions.length === 0) && (
                    <tr>
                      <td colSpan={5} className="empty-row">No subscriptions recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="transaction-section glass">
            <div className="table-responsive">
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>Settlement Date</th>
                    <th>Artist</th>
                    <th>Artist Wallet</th>
                    <th>Streams</th>
                    <th>Payout (ETH)</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.royaltyDistributions.map(rd => (
                    <tr key={rd.id}>
                      <td className="date-cell">
                        <Calendar size={14} className="icon" />
                        {new Date(rd.createdAt).toLocaleDateString()}
                      </td>
                      <td className="user-cell">
                        <div className="user-info">
                          <span className="name">{rd.artist.name || 'Unnamed Artist'}</span>
                        </div>
                      </td>
                      <td className="wallet-cell">
                        <code>{rd.artist.address.slice(0, 8)}...{rd.artist.address.slice(-6)}</code>
                        <a href={`https://sepolia.basescan.org/address/${rd.artist.address}`} target="_blank" rel="noreferrer">
                          <ExternalLink size={12} />
                        </a>
                      </td>
                      <td className="streams-cell">
                        <Music size={14} className="icon" />
                        {rd.streamsCount}
                      </td>
                      <td className="amount-cell">
                        <span className="amount">{rd.payoutAmount.toFixed(4)} ETH</span>
                      </td>
                    </tr>
                  ))}
                  {(!data?.royaltyDistributions || data.royaltyDistributions.length === 0) && (
                    <tr>
                      <td colSpan={5} className="empty-row">No royalty settlements recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        .transactions-page {
          padding: 1rem;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 3rem;
          gap: 2rem;
          flex-wrap: wrap;
        }
        .header-text h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .header-text p {
          opacity: 0.6;
        }
        .loading-state {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 60vh;
          font-size: 1.25rem;
          color: var(--primary);
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .tab-switcher {
          display: flex;
          padding: 0.4rem;
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .tab-switcher button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.5rem;
          border-radius: 0.75rem;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .tab-switcher button.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
        }
        .transaction-section {
          padding: 1rem;
          border-radius: 1.5rem;
          overflow: hidden;
        }
        .table-responsive {
          overflow-x: auto;
        }
        .tx-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .tx-table th {
          padding: 1.25rem 1rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.4;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .tx-table td {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
          vertical-align: middle;
        }
        .tx-table tr:hover td {
          background: rgba(255, 255, 255, 0.01);
        }
        .date-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        .icon {
          opacity: 0.3;
          color: var(--primary);
        }
        .user-info {
          display: flex;
          flex-direction: column;
        }
        .user-info .name {
          font-weight: 600;
          font-size: 0.95rem;
        }
        .user-info .email {
          font-size: 0.75rem;
          opacity: 0.4;
        }
        .wallet-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .wallet-cell code {
          background: rgba(255, 255, 255, 0.05);
          padding: 0.2rem 0.5rem;
          border-radius: 0.4rem;
          font-family: monospace;
          font-size: 0.85rem;
          opacity: 0.7;
        }
        .wallet-cell a {
          color: var(--primary);
          opacity: 0.5;
          transition: 0.2s;
        }
        .wallet-cell a:hover {
          opacity: 1;
        }
        .badge {
          padding: 0.25rem 0.6rem;
          border-radius: 0.5rem;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .tier-badge {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .hash-link {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--primary);
          text-decoration: none;
          font-size: 0.85rem;
          font-family: monospace;
        }
        .streams-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
        }
        .amount-cell .amount {
          font-weight: 700;
          color: #10b981;
          font-size: 1rem;
        }
        .empty-row {
          text-align: center;
          padding: 4rem;
          opacity: 0.3;
          font-style: italic;
        }
        .muted {
          opacity: 0.3;
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
}
