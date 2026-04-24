'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Wallet, Music2, PlusCircle, Compass, LogOut, User, LogIn, Star, Home, Search, Library, FileText } from 'lucide-react';

import WalletConnect from '@/components/web3/WalletConnect';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Menu, X } from 'lucide-react';

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === "loading";

  const [mounted, setMounted] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  const isAdmin = user?.role === 'ADMIN';

  const navLinks = isAdmin 
    ? [
        { name: 'Admin Dashboard', href: '/admin', icon: Home },
        { name: 'Transactions', href: '/admin/transactions', icon: FileText },
      ]
    : [
        { name: 'Discover', href: '/explore', icon: Compass },
        { name: 'Search', href: '/search', icon: Search },
        { name: 'Library', href: '/library', icon: Library },
        { name: 'Premium', href: '/subscription', icon: Star },
        ...(user?.role === 'ARTIST' ? [
          { name: 'Mint', href: '/mint', icon: PlusCircle },
          { name: 'Studio', href: '/artist', icon: Music2 }
        ] : []),
      ];

  if (!mounted) return null;

  return (
    <>
      {/* Mobile Header / Burger */}
      <div className="mobile-header">
        <Link href={isAdmin ? "/admin" : "/"} className="sidebar-logo">
          <Music2 size={24} color="var(--primary)" />
          <span>Dyllicit</span>
        </Link>
        <button className="burger-btn" onClick={toggleSidebar}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Desktop & Mobile Sidebar */}
      <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header-desktop">
          <Link href={isAdmin ? "/admin" : "/"} className="sidebar-logo" onClick={closeSidebar}>
            <Music2 size={32} color="var(--primary)" />
            <span>Dyllicit</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '1px', marginBottom: '0.5rem', paddingLeft: '1rem' }}>Menu</p>
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <Icon />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={{ marginTop: 'auto' }}>
          <div style={{ marginBottom: '1rem' }}>
            <WalletConnect />
          </div>

          {!user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Button variant="secondary" size="sm" onClick={() => signIn('google')} fullWidth>
                <LogIn size={16} /> Sign In
              </Button>
              <Link href="/signup">
                <Button variant="primary" size="sm" fullWidth>Sign Up</Button>
              </Link>
            </div>
          ) : (
            <div className="user-section" style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <User size={20} color="white" />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name || user.email}</p>
                  <p style={{ fontSize: '0.7rem', opacity: 0.5, margin: 0 }}>{user.role}</p>
                </div>
              </div>
              
              {!user.isSubscribed && (
                <Link href="/subscription" style={{ display: 'block', marginBottom: '1rem' }}>
                  <Button variant="primary" size="sm" fullWidth style={{ background: 'linear-gradient(45deg, var(--primary), var(--accent))' }}>
                    <Star size={14} className="mr-1" /> Get Premium
                  </Button>
                </Link>
              )}
              
              {user.isSubscribed && (
                 <div style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)', padding: '0.2rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.65rem', fontWeight: 800, marginBottom: '0.75rem', textAlign: 'center' }}>
                   PREMIUM MEMBER
                 </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => { signOut({ callbackUrl: isAdmin ? '/admin/login' : '/' }); }} className="logout-btn" style={{ flex: 1, height: '36px', borderRadius: '18px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LogOut size={16} />
                </button>
                {!isAdmin && (
                  <Link href="/profile" style={{ flex: 1 }}>
                    <button style={{ width: '100%', height: '36px', borderRadius: '18px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={16} />
                    </button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <div className="bottom-nav">
        {navLinks.slice(0, 4).map((link) => {
          const Icon = link.icon;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`bottom-nav-link ${pathname === link.href ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{link.name}</span>
            </Link>
          );
        })}
        {!isAdmin && (
          <Link 
            href="/profile"
            className={`bottom-nav-link ${pathname === '/profile' ? 'active' : ''}`}
          >
            <User size={20} />
            <span>Profile</span>
          </Link>
        )}
      </div>

      <style jsx>{`
        .mobile-header {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          padding: 0 1.5rem;
          background: rgba(5, 5, 5, 0.8);
          backdrop-filter: blur(20px);
          z-index: 4500;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
        }
        .burger-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 4800;
        }
        .sidebar-header-desktop {
          margin-bottom: 2rem;
        }

        @media (max-width: 1024px) {
          .mobile-header {
            display: flex;
          }
          .sidebar {
            position: fixed;
            left: -280px;
            top: 0;
            bottom: 0;
            width: 280px;
            z-index: 4900;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: #050505;
            padding-bottom: 2rem;
            display: flex !important;
          }
          .sidebar.mobile-open {
            transform: translateX(280px);
          }
          .sidebar-header-desktop {
            display: block;
          }
        }

        @media (min-width: 1025px) {
          .sidebar-header-desktop {
             display: block;
          }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
