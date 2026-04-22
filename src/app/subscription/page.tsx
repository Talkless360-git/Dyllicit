"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useWriteContract, useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import Button from "@/components/ui/Button";
import { CheckCircle, Loader2, Zap, Shield, Download, Music, Star, ArrowRight } from "lucide-react";
import SubscriptionABI from "@/lib/blockchain/contracts/ChainStreamSubscription.json";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";

export default function SubscriptionPage() {
  const { data: session, update } = useSession();
  const { isConnected } = useAccount();
  const router = useRouter();
  
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check backend subscription status
  useEffect(() => {
    fetch("/api/subscription")
      .then(res => res.json())
      .then(data => {
        setSubscribed(data.subscribed);
        setLoading(false);
      });
  }, []);

  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && hash) {
      // Complete subscription on backend
      fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txnHash: hash })
      }).then(async () => {
        // Update session so the frontend knows we're subscribed
        await update();
        setSubscribed(true);
      });
    }
  }, [isSuccess, hash, update]);

  const handleSubscribe = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first via the Sidebar.");
      return;
    }
    
    try {
      await writeContractAsync({
        address: SubscriptionABI.address as `0x${string}`,
        abi: SubscriptionABI.abi,
        functionName: 'subscribe',
        value: parseEther("0.01"),
      });
    } catch (err) {
      console.error(err);
      alert("Transaction failed or was rejected.");
    }
  };

  if (!session) {
    return (
      <div className="login-prompt">
         <Star size={48} className="star-icon" />
         <h1>Elevate Your Experience</h1>
         <p>Sign in to unlock Premium benefits and support your favorite artists.</p>
         <Button variant="primary" size="lg" onClick={() => router.push('/signup')}>Sign Up Now</Button>
         <style jsx>{`
            .login-prompt {
               height: 80vh;
               display: flex;
               flex-direction: column;
               align-items: center;
               justify-content: center;
               gap: 1.5rem;
               color: white;
               text-align: center;
            }
            .star-icon { color: var(--primary); margin-bottom: 1rem; }
            h1 { font-size: 3rem; font-weight: 800; letter-spacing: -1px; }
            p { opacity: 0.6; max-width: 400px; font-size: 1.1rem; }
         `}</style>
      </div>
    );
  }

  return (
    <div className="subscription-container">
      <div className="premium-glow"></div>
      
      <header className="premium-header">
        <span className="badge">GO PREMIUM</span>
        <h1>Unlock the Full Potential</h1>
        <p>Join the next generation of music listeners with ChainStream Premium.</p>
      </header>

      {loading ? (
        <div className="loader-wrapper">
          <Loader2 className="animate-spin" size={40} />
        </div>
      ) : subscribed ? (
        <div className="success-card glass animate-slide-up">
          <div className="success-icon-wrapper">
            <CheckCircle color="#10b981" size={60} />
          </div>
          <h2>Welcome to the Inner Circle</h2>
          <p>Your account is now active with Premium benefits. Enjoy ad-free music and exclusive access.</p>
          <div className="benefits-gridmini">
             <div className="b-item"><Shield size={16} /> Ad-Free</div>
             <div className="b-item"><Download size={16} /> Offline</div>
             <div className="b-item"><Zap size={16} /> High Quality</div>
          </div>
          <Button variant="secondary" size="lg" onClick={() => router.push('/explore')}>Start Listening <ArrowRight size={18} /></Button>
        </div>
      ) : (
        <div className="pricing-layout animate-slide-up">
          <div className="pricing-card glass highlight">
            <div className="tier-info">
              <h3>Monthly Pass</h3>
              <div className="price">
                <span className="amount">0.01 ETH</span>
                <span className="period">/ month</span>
              </div>
            </div>

            <div className="benefits-list">
              <div className="benefit">
                <Music size={20} className="icon" />
                <div>
                  <strong>Unlimited Ad-Free Music</strong>
                  <p>Interrupt-free listening across all devices.</p>
                </div>
              </div>
              <div className="benefit">
                <Download size={20} className="icon" />
                <div>
                  <strong>Offline Playback</strong>
                  <p>Keep your favorites playable even without internet.</p>
                </div>
              </div>
              <div className="benefit">
                <Zap size={20} className="icon" />
                <div>
                  <strong>Artist Royalties+</strong>
                  <p>30% more of your streaming revenue goes to artists.</p>
                </div>
              </div>
              <div className="benefit">
                 <Shield size={20} className="icon" />
                 <div>
                   <strong>Exclusive Media Access</strong>
                   <p>Early access to drops and NFT-gated tracks.</p>
                 </div>
              </div>
            </div>

            <Button 
              variant="primary" 
              size="lg" 
              onClick={handleSubscribe} 
              disabled={isPending || isConfirming}
              className="subscribe-btn"
              fullWidth
            >
              {isPending || isConfirming ? <Loader2 className="animate-spin" /> : "Subscribe with Wallet"}
            </Button>
            
            <p className="footer-note">Secure on-chain transaction. Gas fees apply.</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .subscription-container {
          min-height: 100vh;
          padding: 8rem 2rem 4rem;
          color: white;
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
        }
        .premium-glow {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 300px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%);
          pointer-events: none;
          z-index: -1;
        }
        .premium-header {
          text-align: center;
          margin-bottom: 4rem;
        }
        .badge {
          background: var(--primary);
          padding: 0.35rem 1rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 1.5rem;
          display: inline-block;
        }
        .premium-header h1 {
          font-size: 3.5rem;
          font-weight: 800;
          letter-spacing: -2px;
          margin-bottom: 1rem;
          background: linear-gradient(to bottom, #fff, #999);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .premium-header p {
          font-size: 1.25rem;
          opacity: 0.6;
          max-width: 600px;
          margin: 0 auto;
        }
        .loader-wrapper {
          display: flex;
          justify-content: center;
          padding: 4rem;
        }
        .pricing-layout {
          display: flex;
          justify-content: center;
        }
        .pricing-card {
          width: 100%;
          max-width: 500px;
          padding: 3rem;
          border-radius: 2rem;
          position: relative;
          overflow: hidden;
        }
        .pricing-card.highlight {
          border: 1px solid rgba(139, 92, 246, 0.3);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .tier-info {
          margin-bottom: 3rem;
          text-align: center;
        }
        .tier-info h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .price {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0.5rem;
        }
        .amount {
          font-size: 3.5rem;
          font-weight: 800;
          color: var(--primary);
        }
        .period {
          opacity: 0.5;
        }
        .benefits-list {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          margin-bottom: 3.5rem;
        }
        .benefit {
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
        }
        .benefit .icon {
          color: var(--primary);
          flex-shrink: 0;
          margin-top: 0.25rem;
        }
        .benefit strong {
          display: block;
          margin-bottom: 0.25rem;
        }
        .benefit p {
          font-size: 0.9rem;
          opacity: 0.5;
          margin: 0;
        }
        .footer-note {
          text-align: center;
          font-size: 0.8rem;
          opacity: 0.4;
          margin-top: 1.5rem;
        }
        .success-card {
          text-align: center;
          padding: 4rem;
          max-width: 600px;
          margin: 0 auto;
          border-radius: 2.5rem;
        }
        .success-icon-wrapper {
          margin-bottom: 2rem;
          display: inline-flex;
          padding: 1.5rem;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 50%;
        }
        .success-card h2 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
        .success-card p {
          opacity: 0.6;
          margin-bottom: 2.5rem;
          font-size: 1.1rem;
        }
        .benefits-gridmini {
           display: flex;
           justify-content: center;
           gap: 1.5rem;
           margin-bottom: 3rem;
           font-size: 0.9rem;
           color: var(--primary);
           font-weight: 600;
        }
        .b-item {
           display: flex;
           align-items: center;
           gap: 0.5rem;
           background: rgba(139, 92, 246, 0.1);
           padding: 0.5rem 1rem;
           border-radius: 2rem;
        }
        @media (max-width: 768px) {
          .premium-header h1 { font-size: 2.5rem; }
          .pricing-card { padding: 2rem; }
        }
      `}</style>
    </div>
  );
}
