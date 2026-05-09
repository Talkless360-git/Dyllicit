'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Disc3, Loader2, Wallet, Users } from 'lucide-react';

export default function ArtistNFTs() {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/artist/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        setMedia(data.stats.mediaDetail || []);
        setGlobalStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to fetch NFT stats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  // Filter only items that are NFTs (have a contractAddr and price)
  const nftMedia = media.filter(m => m.contractAddr && m.price !== null);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="animate-fade-in">
      <div className="studio-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Disc3 size={28} color="var(--primary)" />
            NFT Commerce
          </h1>
          <p>Track your fractionalized song NFTs, sales volumes, and ownership statistics.</p>
        </div>
      </div>

      <div className="metrics-grid" style={{ marginBottom: '3rem' }}>
        <div className="metric-card glass">
          <div className="metric-header">
            <Users size={24} color="#8b5cf6" />
            <span>Total Fractions Sold</span>
          </div>
          <div className="metric-value">{globalStats?.totalSharesSold || 0}</div>
          <div className="metric-footer">Across all your minted tracks</div>
        </div>

        <div className="metric-card glass">
          <div className="metric-header">
            <Wallet size={24} color="#f59e0b" />
            <span>Total NFT Revenue</span>
          </div>
          <div className="metric-value">{(globalStats?.totalSalesRevenue || 0).toFixed(4)} ETH</div>
          <div className="metric-footer">Net earnings after platform fees</div>
        </div>
        
        <div className="metric-card glass">
          <div className="metric-header">
            <Disc3 size={24} color="#10b981" />
            <span>Active NFT Tracks</span>
          </div>
          <div className="metric-value">{nftMedia.length}</div>
          <div className="metric-footer">Tracks currently available as NFTs</div>
        </div>
      </div>

      <div className="glass table-container">
        <table className="content-table">
          <thead>
            <tr>
              <th>Cover</th>
              <th>Track Title</th>
              <th>NFT Price</th>
              <th>Sold / Total Shares</th>
              <th>Fractions Left</th>
              <th>Sales Revenue</th>
            </tr>
          </thead>
          <tbody>
            {nftMedia.map((item) => {
              const sharesLeft = item.sharesLeft !== undefined ? item.sharesLeft : item.totalShares;
              const isSoldOut = sharesLeft === 0;
              const isExpanded = expandedItems[item.id];
              
              return (
                <React.Fragment key={item.id}>
                  <tr 
                    onClick={() => toggleExpand(item.id)} 
                    style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                    className={isExpanded ? 'active-row' : ''}
                  >
                    <td className="title-cell" style={{ width: '80px' }}>
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt="Cover" className="thumbnail" />
                      ) : (
                        <div className="thumbnail" style={{ background: '#333' }}></div>
                      )}
                    </td>
                    <td>
                      <strong>{item.title}</strong>
                      <br />
                      <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{item.genre || 'Music'}</span>
                    </td>
                    <td>
                      {item.price} ETH
                    </td>
                    <td style={{ minWidth: '150px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', opacity: 0.7 }}>
                        <span>{item.sharesSold || 0} Sold</span>
                        <span>{item.totalShares} Total</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${item.supplySoldPercentage}%` }}
                        ></div>
                      </div>
                    </td>
                    <td>
                      {item.totalShares > 1 ? (
                        <span className={`status-badge ${isSoldOut ? 'danger' : 'success'}`}>
                          {sharesLeft} Left
                        </span>
                      ) : (
                        <span style={{ opacity: 0.5 }}>Single Edition</span>
                      )}
                    </td>
                    <td style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                      {item.salesRevenue ? `${item.salesRevenue.toFixed(4)} ETH` : '-'}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="expanded-row">
                      <td colSpan={6}>
                        <div className="collectors-container animate-slide-down">
                          <div className="collectors-header">
                            <h4>Recent Collectors</h4>
                            <span>{item.collectors?.length || 0} Addresses</span>
                          </div>
                          {item.collectors && item.collectors.length > 0 ? (
                            <div className="collectors-list">
                              {item.collectors.map((c: any) => (
                                <div key={c.id} className="collector-card">
                                  <div className="collector-info">
                                    <div className="avatar">
                                      {c.image ? <img src={c.image} alt="" /> : <span>{c.name?.[0] || 'U'}</span>}
                                    </div>
                                    <div>
                                      <p className="collector-name">{c.name || `${c.address?.slice(0, 6)}...${c.address?.slice(-4)}`}</p>
                                      <p className="collector-date">{new Date(c.purchasedAt).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                  <div className="collector-quantity">
                                    {c.quantity} {c.quantity > 1 ? 'shares' : 'share'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="no-collectors">No external collectors yet. Be the first to market your track!</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            
            {nftMedia.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  You haven't minted any tracks as NFTs yet.
                  <br />
                  <Link href="/artist/upload" style={{ color: 'var(--primary)', marginTop: '1rem', display: 'inline-block' }}>
                    Upload & Mint a Track
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .studio-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2.5rem;
        }
        .studio-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          letter-spacing: -1px;
        }
        .studio-header p {
          color: rgba(255, 255, 255, 0.6);
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .metric-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .metric-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .metric-value {
          font-size: 2.5rem;
          font-weight: 700;
        }
        .metric-footer {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .table-container {
          padding: 1rem;
          overflow-x: auto;
        }
        .content-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .content-table th {
          padding: 1rem;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgba(255, 255, 255, 0.5);
          border-bottom: 1px solid var(--glass-border);
        }
        .content-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          vertical-align: middle;
        }
        .thumbnail {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          object-fit: cover;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-badge.success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .status-badge.danger {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .empty-state {
          text-align: center;
          padding: 4rem 1rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .active-row {
          background: rgba(255, 255, 255, 0.03);
        }
        .progress-bar-bg {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 3px;
          transition: width 1s ease-out;
        }
        .expanded-row td {
          padding: 0 !important;
          border-bottom: none !important;
        }
        .collectors-container {
          background: rgba(0, 0, 0, 0.2);
          padding: 1.5rem 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .collectors-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .collectors-header h4 {
          margin: 0;
          font-size: 0.9rem;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .collectors-header span {
          font-size: 0.8rem;
          opacity: 0.5;
        }
        .collectors-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1rem;
        }
        .collector-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 0.75rem;
          border-radius: 0.75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .collector-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.8rem;
          overflow: hidden;
        }
        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .collector-name {
          margin: 0;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .collector-date {
          margin: 0;
          font-size: 0.7rem;
          opacity: 0.5;
        }
        .collector-quantity {
          font-size: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: 4px;
          color: var(--primary);
        }
        .no-collectors {
          text-align: center;
          padding: 1rem;
          font-size: 0.9rem;
          opacity: 0.4;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

