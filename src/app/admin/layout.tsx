'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  BarChart3, 
  Users, 
  Settings, 
  Database, 
  Activity, 
  Music2,
  Home,
  Menu,
  X,
  LogOut,
  FileText
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

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  // If we are on the login page, don't trap them inside the sidebar shell
  if (pathname?.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  // Security check: Only allow true ADMINs to load the main wrapper. 
  // Wait until next-auth loads.
  if (status === 'loading') return <div style={{ minHeight: '100vh', background: '#050505' }}></div>;
  
  if (status === 'unauthenticated') {
    router.push('/admin/login');
    return null;
  }

  if (session?.user?.role !== 'ADMIN') {
     return (
       <div style={{ 
         minHeight: '100vh', 
         display: 'flex', 
         flexDirection: 'column', 
         alignItems: 'center', 
         justifyContent: 'center',
         background: '#050505',
         color: 'white',
         padding: '2rem',
         textAlign: 'center'
       }}>
         <h1 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '1rem' }}>Access Denied</h1>
         <p style={{ opacity: 0.6, maxWidth: '400px', marginBottom: '2rem' }}>
           You do not have the required administrative privileges to view this section. 
           Please switch to an authorized wallet.
         </p>
         <WalletConnect />
         <Link href="/" style={{ marginTop: '2rem', color: 'var(--primary)', textDecoration: 'none' }}>
           Return to Home
         </Link>
       </div>
     );
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="admin-container">
      {/* Admin Mobile Header */}
      <div className="admin-mobile-header">
        <Link href="/admin" className="logo">
          <Music2 size={24} className="logo-icon" />
          <span className="logo-text">Admin</span>
        </Link>
        <button className="burger-btn" onClick={toggleSidebar}>
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <aside className={`admin-sidebar glass ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link href="/admin" className="logo" onClick={closeSidebar}>
            <Music2 size={24} className="logo-icon" />
            <span className="logo-text">Admin</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {[
            { name: 'Dashboard', href: '/admin', icon: BarChart3 },
            { name: 'Users', href: '/admin/users', icon: Users },
            { name: 'Tracks', href: '/admin/tracks', icon: Database },
            { name: 'Transactions', href: '/admin/transactions', icon: FileText },
            { name: 'Royalties', href: '/admin/royalties', icon: Activity },
            { name: 'Settings', href: '/admin/settings', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button 
            onClick={() => { signOut({ callbackUrl: '/admin/login' }); }} 
            className="sidebar-link logout-trigger"
            style={{ 
              width: '100%', 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              border: 'none', 
              cursor: 'pointer',
              marginTop: '0.5rem'
            }}
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
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

        .admin-mobile-header {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 64px;
          background: #0a0a0a;
          border-bottom: 1px solid var(--glass-border);
          padding: 0 1.5rem;
          align-items: center;
          justify-content: space-between;
          z-index: 4500;
        }

        .burger-btn {
          background: none; border: none; color: white; cursor: pointer;
        }

        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 4800;
        }

        @media (max-width: 1024px) {
          .admin-mobile-header {
            display: flex;
          }
          .admin-sidebar {
            position: fixed;
            left: -260px;
            z-index: 4900;
            transition: transform 0.3s ease;
          }
          .admin-sidebar.open {
            transform: translateX(260px);
          }
          .admin-content {
            padding: 6rem 1.5rem 4rem;
          }
        }
      `}</style>
    </div>
  );
}
