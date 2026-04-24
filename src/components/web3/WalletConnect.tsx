'use client';

import React from 'react';
import { useAccount, useConnect, useDisconnect, useBalance, useSignMessage } from 'wagmi';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/Button';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

interface WalletConnectProps {
  fullWidth?: boolean;
}

/**
 * WalletConnect Component
 * 
 * A reusable component that handles Web3 wallet connection, account display, 
 * balance visualization, and automatic backend wallet binding.
 */
const WalletConnect: React.FC<WalletConnectProps> = ({ fullWidth = true }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const { data: session, update } = useSession();
  const user = session?.user;
  const { signMessageAsync } = useSignMessage();
  
  const [mounted, setMounted] = React.useState(false);
  const lastBoundAddress = React.useRef<string | null>(null);
  const bindingRef = React.useRef(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Sync wallet address with backend session to maintain consistency
  React.useEffect(() => {
    const bindWallet = async () => {
      if (!mounted || !isConnected || !address || !user) return;
      
      const currentAddress = address.toLowerCase();
      const sessionAddress = user.address?.toLowerCase();
      
      // Only bind if addresses don't match and we haven't tried this address yet in this mount
      if (sessionAddress !== currentAddress && lastBoundAddress.current !== currentAddress && !bindingRef.current) {
        console.log(`[WalletConnect] Logic trigger: session=${sessionAddress}, wallet=${currentAddress}`);
        bindingRef.current = true;
        
        try {
          const message = `Verify wallet ownership for Dyllicit: ${address}`;
          console.log("[WalletConnect] Requesting signature...");
          const signature = await signMessageAsync({ message });

          const res = await fetch('/api/user/bind-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, signature, message })
          });
          
          if (res.ok) {
            console.log("[WalletConnect] Binding successful, updating session...");
            lastBoundAddress.current = currentAddress;
            await update({ address });
          } else {
            const err = await res.json();
            console.error("[WalletConnect] Binding failed:", err.error);
            // If it failed, don't keep trying immediately
            lastBoundAddress.current = currentAddress;
          }
        } catch (e) {
          console.error("[WalletConnect] Interaction error:", e);
          // If user rejects signature, don't prompt again immediately for this address
          lastBoundAddress.current = currentAddress;
        } finally {
          bindingRef.current = false;
        }
      }
    };
    
    bindWallet();
  }, [isConnected, address, user, update, signMessageAsync]);

  const shortenAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (!mounted) return null;

  // State: Not Connected
  if (!isConnected) {
    return (
      <Button 
        variant="primary" 
        size="sm" 
        fullWidth={fullWidth}
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="animate-spin" size={16} /> : <Wallet size={16} />}
        <span>Connect Wallet</span>
      </Button>
    );
  }

  // State: Connected
  return (
    <div className="wallet-info-card glass">
      <div className="wallet-details">
        <div className="wallet-icon">
          <Wallet size={16} color="var(--primary)" />
        </div>
        <div className="wallet-meta">
          <p className="address">{shortenAddress(address!)}</p>
          <p className="balance">
            {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0.0000 ETH'}
          </p>
        </div>
        <button onClick={() => disconnect()} className="disconnect-btn" title="Disconnect Wallet">
          <LogOut size={14} />
        </button>
      </div>

      <style jsx>{`
        .wallet-info-card {
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          transition: var(--transition);
        }
        .wallet-info-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .wallet-details {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .wallet-icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .wallet-meta {
          flex: 1;
          min-width: 0;
        }
        .address {
          font-size: 0.85rem;
          font-weight: 700;
          margin: 0;
          color: white;
          line-height: 1.2;
        }
        .balance {
          font-size: 0.7rem;
          opacity: 0.5;
          margin: 0;
          font-weight: 600;
          letter-spacing: 0.2px;
        }
        .disconnect-btn {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.1);
          color: rgba(239, 68, 68, 0.6);
          cursor: pointer;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition);
          flex-shrink: 0;
        }
        .disconnect-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
};

export default WalletConnect;
