'use client';

import React from 'react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { useAccount, useConnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Shield, Zap, Lock, Music, Play } from 'lucide-react';

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
      router.push(user.role === 'ADMIN' ? '/admin' : '/explore');
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
        <h1 className="gradient-text">Dyllicit</h1>
        <p className="subtitle">The Future of Decentralized Media</p>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="glass hero-card">
            <div className="hero-content">
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

            <div className="hero-visual">
              <div className="hero-slider">
                <div className="slide">
                  <Image src="/music_studio_futuristic_1776978173927.png" alt="Futuristic Music Studio" fill style={{ objectFit: 'cover' }} priority />
                </div>
                <div className="slide">
                  <Image src="/audio_visualization_abstract_1776978231570.png" alt="Audio Visualization" fill style={{ objectFit: 'cover' }} />
                </div>
                <div className="slide">
                  <Image src="/concert_neon_lights_1776978279068.png" alt="Neon Concert" fill style={{ objectFit: 'cover' }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="feature-item glass">
            <div className="icon-wrapper"><Shield size={28} /></div>
            <h3>NFT Ownership</h3>
            <p>Every track you buy is an ERC-1155 NFT in your wallet, giving you true digital ownership.</p>
          </div>
          <div className="feature-item glass">
            <div className="icon-wrapper"><Zap size={28} /></div>
            <h3>Direct Royalties</h3>
            <p>Artists get paid instantly through smart contracts, cutting out the middleman entirely.</p>
          </div>
          <div className="feature-item glass">
            <div className="icon-wrapper"><Lock size={28} /></div>
            <h3>Gated Access</h3>
            <p>Exclusive content for the true collectors. Unlock restricted tracks with your NFT keys.</p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>&copy; 2026 Dyllicit Protocol. All rights reserved.</p>
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
          font-size: 6rem;
          margin-bottom: 0.5rem;
          letter-spacing: -4px;
          line-height: 1;
        }
        .subtitle {
          font-size: 1.5rem;
          opacity: 0.6;
          font-weight: 500;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .landing-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 1200px;
        }
        .hero {
          padding: 2rem;
          width: 100%;
          display: flex;
          justify-content: center;
          position: relative;
          min-height: 70vh;
          margin-bottom: 5rem;
        }
        .hero-card {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          max-width: 1100px;
          width: 100%;
          min-height: 550px;
          border-radius: 3.5rem;
          overflow: hidden;
          background: #111;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5);
          animation: float 6s ease-in-out infinite;
        }
        .hero-content {
          padding: 5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: left;
        }
        .hero-visual {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-left: 1px solid rgba(255, 255, 255, 0.05);
        }
        @media (max-width: 968px) {
          .hero-card {
            grid-template-columns: 1fr;
            border-radius: 2rem;
            min-height: auto;
          }
          .hero-content {
            padding: 3rem 2rem;
            text-align: center;
            align-items: center;
          }
          .hero-visual {
            height: 300px;
            border-left: none;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
          }
          .hero-card h2 {
            font-size: 2.5rem;
          }
          .hero-actions {
            justify-content: center;
          }
        }
        .hero-slider {
          display: flex;
          width: 300%;
          height: 100%;
          animation: slideImages 15s infinite ease-in-out;
        }
        .slide {
          width: 100%;
          height: 100%;
          position: relative;
        }
        @keyframes slideImages {
          0%, 25% { transform: translateX(0); }
          33%, 58% { transform: translateX(-33.33%); }
          66%, 91% { transform: translateX(-66.66%); }
          100% { transform: translateX(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .hero-card h2 {
          font-size: 3.5rem;
          margin-bottom: 1.5rem;
          font-weight: 900;
          letter-spacing: -2px;
          line-height: 1.1;
        }
        .hero-card p {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 3rem;
          line-height: 1.6;
        }
        .hero-actions {
          display: flex;
          gap: 1.5rem;
        }
        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
          max-width: 1100px;
          width: 100%;
        }
        .feature-item {
          padding: 3rem 2rem;
          text-align: center;
          border-radius: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
          transition: var(--transition);
          height: 100%;
        }
        .feature-item:hover {
          transform: translateY(-8px);
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 1rem;
          background: rgba(59, 130, 246, 0.1);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
        }
        .feature-item h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }
        .feature-item p {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.6;
          margin: 0;
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
