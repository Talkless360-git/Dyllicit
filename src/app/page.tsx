'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { useAccount, useConnect } from 'wagmi';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { setCurrentTrack } = usePlayerStore();
  const { login, isConnecting: isLoginLoading } = useAuth();
  const { user, isConnecting: isStoreConnecting } = useAuthStore();
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleAuth = async () => {
    if (!isConnected) {
      connect({ connector: connectors[0] });
    } else if (!user) {
      await login();
    } else {
      router.push('/explore');
    }
  };

  const playSample = () => {
    setCurrentTrack({
      id: 'sample-1',
      title: 'Solitude Ritual',
      artist: 'Nexus One',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      type: 'audio',
      isGated: false
    });
  };
  return (
    <div className="landing-page animate-fade-in">
      <header className="landing-header">
        <h1 className="gradient-text">ChainStream</h1>
        <p className="subtitle">The Future of Decentralized Media</p>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="glass hero-card">
            <h2>Own Your Stream. Own Your Sound.</h2>
            <p>
              Connect your wallet to experience the next generation of streaming. 
              Built on Ethereum, owned by you.
            </p>
            <div className="hero-actions">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleAuth}
                disabled={isLoginLoading || isStoreConnecting}
              >
                {!mounted ? 'Connect Wallet' : (user ? 'Go to App' : (isConnected ? 'Sign In to Proceed' : 'Connect Wallet'))}
              </Button>
              <Button variant="glass" size="lg" onClick={playSample}>Explore Music</Button>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="feature-item glass">
            <h3>NFT Ownership</h3>
            <p>Every track you buy is an ERC-1155 NFT in your wallet.</p>
          </div>
          <div className="feature-item glass">
            <h3>Direct Royalties</h3>
            <p>Artists get paid instantly through smart contracts.</p>
          </div>
          <div className="feature-item glass">
            <h3>Gated Access</h3>
            <p>Exclusive content for the true collectors.</p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>&copy; 2026 ChainStream Protocol. All rights reserved.</p>
      </footer>

      <style jsx>{`
        .landing-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: radial-gradient(circle at center, #110e1a 0%, #050505 100%);
        }
        .landing-header {
          text-align: center;
          margin-bottom: 4rem;
        }
        .landing-header h1 {
          font-size: 5rem;
          margin-bottom: 0.5rem;
          letter-spacing: -2px;
        }
        .hero-card {
          padding: 4rem;
          max-width: 800px;
          text-align: center;
          margin-bottom: 4rem;
        }
        .hero-card h2 {
          font-size: 2.5rem;
          margin-bottom: 1.5rem;
        }
        .hero-card p {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 2.5rem;
        }
        .hero-actions {
          display: flex;
          gap: 1.5rem;
          justify-content: center;
        }
        .features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          max-width: 1000px;
          width: 100%;
        }
        .feature-item {
          padding: 2rem;
          text-align: center;
        }
        .feature-item h3 {
          margin-bottom: 1rem;
          color: var(--primary);
        }
        .feature-item p {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .landing-footer {
          margin-top: 6rem;
          opacity: 0.4;
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
}
