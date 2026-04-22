'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Wallet, Music2, PlusCircle, Compass, LogOut, User, LogIn, Star, Home, Search, Library } from 'lucide-react';

import WalletConnect from '@/components/web3/WalletConnect';
import { useSession, signIn, signOut } from 'next-auth/react';

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === "loading";

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { name: 'Discover', href: '/explore', icon: Compass },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Library', href: '/library', icon: Library },
    ...(user?.role === 'ARTIST' || user?.role === 'ADMIN' ? [
      { name: 'Mint', href: '/mint', icon: PlusCircle },
      { name: 'Studio', href: '/artist', icon: Music2 }
    ] : []),
  ];

  if (!mounted) return null;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <Link href="/" className="sidebar-logo">
          <Music2 size={32} color="var(--primary)" />
          <span>ChainStream</span>
        </Link>

        <nav className="sidebar-nav">
          <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '1px', marginBottom: '0.5rem', paddingLeft: '1rem' }}>Menu</p>
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
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
              
              {user.isSubscribed && (
                 <div style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)', padding: '0.2rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.65rem', fontWeight: 800, marginBottom: '0.75rem', textAlign: 'center' }}>
                   PREMIUM MEMBER
                 </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => { signOut(); }} className="logout-btn" style={{ flex: 1, height: '36px', borderRadius: '18px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LogOut size={16} />
                </button>
                <Link href="/profile" style={{ flex: 1 }}>
                  <button style={{ width: '100%', height: '36px', borderRadius: '18px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} />
                  </button>
                </Link>
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
        <Link 
          href="/profile"
          className={`bottom-nav-link ${pathname === '/profile' ? 'active' : ''}`}
        >
          <User size={20} />
          <span>Profile</span>
        </Link>
      </div>
    </>
  );
};

export default Sidebar;
