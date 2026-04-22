'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  BarChart3, 
  Users, 
  Settings, 
  Database, 
  Activity, 
  Music2,
  Home
} from 'lucide-react';
import WalletConnect from '@/components/web3/WalletConnect';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
// ... (omitting intermediate lines for brevity in thinking, but will include in tool call)
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const router = useRouter();

  // If we are exactly on the login page, don't trap them inside the sidebar shell
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Security check: Only allow true ADMINs to load the main wrapper. 
  // Wait until next-auth loads.
  if (status === 'loading') return <div style={{ minHeight: '100vh', background: '#050505' }}></div>;
  
  if (status === 'unauthenticated' || session?.user?.role !== 'ADMIN') {
     router.push('/explore');
     return null;
  }

  return (
    <div className="admin-container">
      <aside className="admin-sidebar glass">
        <div className="sidebar-header">
          <Link href="/" className="logo">
            <Music2 size={24} className="logo-icon" />
            <span className="logo-text">Admin</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {[
            { name: 'Dashboard', href: '/admin', icon: BarChart3 },
            { name: 'Users', href: '/admin/users', icon: Users },
            { name: 'Tracks', href: '/admin/tracks', icon: Database },
            { name: 'Royalties', href: '/admin/royalties', icon: Activity },
            { name: 'Settings', href: '/admin/settings', icon: Settings },
          ].map((item) => {
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
          <div style={{ marginBottom: '1rem' }}>
            <WalletConnect />
          </div>
          <Link href="/" className="sidebar-link">
            <Home size={20} />
            <span>Exit Admin</span>
          </Link>
        </div>
      </aside>

      <main className="admin-content">
        {children}
      </main>

      <style jsx>{`
        .admin-container {
          display: flex;
          min-height: 100vh;
          background: #050505;
          color: white;
        }
        .admin-sidebar {
          width: 260px;
          height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 2rem 1.5rem;
          position: sticky;
          top: 0;
          border-right: 1px solid var(--glass-border);
          border-radius: 0;
        }
        .sidebar-header {
          margin-bottom: 3rem;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: white;
        }
        .logo-icon {
          color: var(--primary);
        }
        .logo-text {
          font-weight: 700;
          font-size: 1.25rem;
          letter-spacing: -0.5px;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem 1rem;
          text-decoration: none;
          color: rgba(255, 255, 255, 0.6);
          border-radius: 0.75rem;
          transition: var(--transition);
        }
        .sidebar-link:hover, .sidebar-link.active {
          color: white;
          background: rgba(139, 92, 246, 0.1);
        }
        .sidebar-link.active {
          color: var(--primary);
          background: rgba(139, 92, 246, 0.15);
        }
        .sidebar-footer {
          margin-top: auto;
          border-top: 1px solid var(--glass-border);
          padding-top: 1.5rem;
        }
        .admin-content {
          flex: 1;
          padding: 4rem;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
