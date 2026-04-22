'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Play, 
  DollarSign, 
  Music, 
  TrendingUp,
  ArrowUpRight,
  Clock
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalMedia: number;
  totalStreams: number;
  totalTransactions: number;
  recentTransactions: any[];
  topMedia: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats);
        }
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading-state">Loading Analytics...</div>;

  const cards = [
    { name: 'Total Streams', value: stats?.totalStreams || 0, icon: Play, color: '#8b5cf6' },
    { name: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: '#3b82f6' },
    { name: 'Total Media', value: stats?.totalMedia || 0, icon: Music, color: '#ec4899' },
    { name: 'payouts (Est.)', value: `$${(stats?.totalStreams || 0 * 0.05).toFixed(2)}`, icon: DollarSign, color: '#10b981' },
  ];

  return (
    <div className="dashboard-content animate-fade-in">
      <header className="page-header">
        <h1>Dashboard Overview</h1>
        <p>Real-time performance and ecosystem activity.</p>
      </header>

      <div className="stats-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.name} className="stat-card glass">
              <div className="stat-icon" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
                <Icon size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-name">{card.name}</span>
                <span className="stat-value">{card.value}</span>
              </div>
              <div className="stat-trend positive">
                <ArrowUpRight size={16} />
                <span>12%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <section className="top-content glass">
          <div className="section-header">
            <TrendingUp size={20} />
            <h3>Top Performing Media</h3>
          </div>
          <div className="media-list">
            {stats?.topMedia.map((m, i) => (
              <div key={m.id} className="media-item">
                <span className="rank">{i + 1}</span>
                <div className="media-details">
                  <span className="m-title">{m.title}</span>
                  <span className="m-streams">{m._count.streams} streams</span>
                </div>
              </div>
            ))}
            {(!stats?.topMedia || stats.topMedia.length === 0) && (
              <p className="empty-msg">No streaming data available yet.</p>
            )}
          </div>
        </section>

        <section className="recent-activity glass">
          <div className="section-header">
            <Clock size={20} />
            <h3>Recent Transactions</h3>
          </div>
          <div className="transaction-list">
            {stats?.recentTransactions.map((tx) => (
              <div key={tx.id} className="tx-item">
                <div className="tx-info">
                  <span className="tx-type">{tx.type.toUpperCase()}</span>
                  <span className="tx-user">{tx.user.address.slice(0, 6)}...{tx.user.address.slice(-4)}</span>
                </div>
                <span className="tx-date">{new Date(tx.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
            {(!stats?.recentTransactions || stats.recentTransactions.length === 0) && (
              <p className="empty-msg">No transactions found.</p>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .loading-state {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 60vh;
          font-size: 1.5rem;
          color: rgba(255, 255, 255, 0.4);
        }
        .page-header {
          margin-bottom: 3rem;
        }
        .page-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .page-header p {
          opacity: 0.6;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        .stat-card {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          position: relative;
        }
        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        .stat-name {
          font-size: 0.9rem;
          opacity: 0.6;
          margin-bottom: 0.25rem;
        }
        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
        }
        .stat-trend {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .stat-trend.positive {
          color: #10b981;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 2rem;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
          color: var(--primary);
        }
        .top-content, .recent-activity {
          padding: 2rem;
        }
        .media-list, .transaction-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .media-item, .tx-item {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 0.75rem;
        }
        .rank {
          font-size: 1.25rem;
          font-weight: 800;
          opacity: 0.2;
          width: 30px;
        }
        .media-details {
          display: flex;
          flex-direction: column;
        }
        .m-title {
          font-weight: 600;
        }
        .m-streams {
          font-size: 0.85rem;
          opacity: 0.5;
        }
        .tx-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .tx-type {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary);
        }
        .tx-user {
          font-family: monospace;
          opacity: 0.6;
        }
        .tx-date {
          font-size: 0.85rem;
          opacity: 0.4;
        }
        .empty-msg {
          text-align: center;
          padding: 2rem;
          opacity: 0.3;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
