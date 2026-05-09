"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatEther } from "viem";
import { Coins, Loader2, Wallet, ArrowUpRight } from "lucide-react";
import Button from "@/components/ui/Button";
import SubscriptionABI from "@/lib/blockchain/contracts/ChainStreamSubscription.json";
import NFTABI from "@/lib/blockchain/contracts/ChainStreamNFT.json";

export default function FractionalEarnings() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { address } = useAccount();
  const [ownedNFTs, setOwnedNFTs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [totalYield, setTotalYield] = useState<number>(0);

  const { writeContractAsync } = useWriteContract();

  const fetchOwnedShares = async () => {
    try {
      const res = await fetch("/api/user/library");
      const data = await res.json();
      if (data.owned) {
        setOwnedNFTs(data.owned.filter((m: any) => m.totalShares > 1));
      }
      if (data.royaltyBalance !== undefined) {
        setTotalYield(data.royaltyBalance);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address && mounted) fetchOwnedShares();
  }, [address, mounted]);

  // ALL HOOKS ABOVE
  if (!mounted) return null;

  const handleClaim = async (tokenId: string) => {
    setClaimingId(tokenId);
    try {
      const hash = await writeContractAsync({
        address: SubscriptionABI.address as `0x${string}`,
        abi: SubscriptionABI.abi,
        functionName: 'claimFractionalRoyalties',
        args: [BigInt(tokenId)],
      });
      alert(`Claim transaction submitted! Hash: ${hash}`);
    } catch (e: any) {
      console.error(e);
      alert(`Claim failed: ${e.message || "Unknown error"}`);
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) return <div className="center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="earnings-container animate-fade-in">
      <div className="earnings-header">
        <div className="title-box">
          <Coins size={32} className="text-primary" />
          <div>
            <h3>Fractional Ownership Earnings</h3>
            <p>Track and claim royalties from songs you've invested in.</p>
          </div>
        </div>
      </div>

      <div className="earnings-grid">
        {ownedNFTs.length === 0 ? (
          <div className="empty-state glass">
            <p>You don't own any fractionalized song shares yet.</p>
          </div>
        ) : (
          ownedNFTs.map(nft => (
            <div key={nft.id} className="earning-card glass-premium">
              <div className="card-top">
                <img src={nft.thumbnailUrl} alt={nft.title} />
                <div className="info">
                  <h4>{nft.title}</h4>
                  <p>{nft.author?.name || "Artist"}</p>
                </div>
              </div>
              
              <div className="stats">
                <div className="stat">
                  <span>Your Shares</span>
                  <strong>{nft.userQuantity || 1}</strong> 
                </div>
                <div className="stat">
                  <span>Total Yield</span>
                  <strong><ArrowUpRight size={14} /> {totalYield.toFixed(4)} ETH</strong>
                </div>
              </div>

              <Button 
                variant="primary" 
                size="sm" 
                fullWidth 
                onClick={() => handleClaim(nft.tokenId)}
                disabled={claimingId === nft.tokenId}
              >
                {claimingId === nft.tokenId ? <Loader2 className="animate-spin" /> : "Claim Royalties"}
              </Button>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .earnings-container { display: flex; flex-direction: column; gap: 2rem; }
        .earnings-header { margin-bottom: 1rem; }
        .title-box { display: flex; gap: 1.5rem; align-items: center; }
        .title-box h3 { margin: 0; font-size: 1.5rem; }
        .title-box p { margin: 0.25rem 0 0; opacity: 0.6; }

        .earnings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        
        .earning-card {
          padding: 1.5rem;
          border-radius: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
        }
        
        .card-top { display: flex; gap: 1rem; align-items: center; }
        .card-top img { width: 60px; height: 60px; border-radius: 0.75rem; object-fit: cover; }
        .card-top h4 { margin: 0; font-size: 1.1rem; }
        .card-top p { margin: 0; opacity: 0.5; font-size: 0.9rem; }
        
        .stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          background: rgba(0,0,0,0.2);
          padding: 1rem;
          border-radius: 0.75rem;
        }
        .stat { display: flex; flex-direction: column; gap: 0.25rem; }
        .stat span { font-size: 0.75rem; opacity: 0.5; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat strong { font-size: 1rem; color: var(--primary); display: flex; align-items: center; gap: 0.25rem; }
        
        .empty-state { padding: 4rem; text-align: center; border-radius: 1rem; opacity: 0.5; }
        .center { padding: 4rem; display: flex; justify-content: center; }
      `}</style>
    </div>
  );
}
