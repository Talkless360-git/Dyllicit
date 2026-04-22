'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Music, 
  BarChart2, 
  Settings, 
  Upload,
  ArrowLeft
} from 'lucide-react';
import WalletConnect from '@/components/web3/WalletConnect';

export default function ArtistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', href: '/artist', icon: LayoutDashboard },
    { name: 'My Content', href: '/artist/content', icon: Music },
    { name: 'Analytics', href: '/artist/analytics', icon: BarChart2 },
    { name: 'Settings', href: '/artist/settings', icon: Settings },
  ];

  return (
    <div className="artist-studio-container">
      <aside className="studio-sidebar glass">
        <div className="sidebar-header">
          <div className="artist-badge">Artist Studio</div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ marginBottom: '1.5rem' }}>
            <WalletConnect />
          </div>
          <Link href="/explore" className="sidebar-link">
            <ArrowLeft size={18} />
            <span>Back to explore</span>
          </Link>
        </div>
      </aside>

      <main className="studio-content">
        {children}
      </main>

      <style jsx>{`
        .artist-studio-container {
          display: flex;
          min-height: 100vh;
          background: #020202;
          color: white;
        }
        .studio-sidebar {
          width: 250px;
          height: 100vh;
          position: sticky;
          top: 0;
          display: flex;
          flex-direction: column;
          padding: 2.5rem 1.5rem;
          border-right: 1px solid var(--glass-border);
          border-radius: 0;
        }
        .sidebar-header {
          margin-bottom: 3.5rem;
        }
        .artist-badge {
          background: linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%);
          padding: 0.5rem 1.25rem;
          border-radius: 2rem;
          font-size: 0.85rem;
          font-weight: 700;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex: 1;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          text-decoration: none;
          color: rgba(255, 255, 255, 0.5);
          border-radius: 1rem;
          transition: var(--transition);
        }
        .sidebar-link:hover, .sidebar-link.active {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }
        .sidebar-link.active {
          background: rgba(139, 92, 246, 0.1);
          color: var(--primary);
          border: 1px solid rgba(139, 92, 246, 0.2);
        }
        .sidebar-footer {
          margin-top: auto;
          padding-top: 1.5rem;
          border-top: 1px solid var(--glass-border);
        }
        .studio-content {
          flex: 1;
          padding: 4rem;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
