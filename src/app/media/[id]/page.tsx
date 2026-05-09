import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PlayCircle, Lock } from "lucide-react";
import MediaInteractions from "@/components/media/MediaInteractions";
import DownloadButton from "@/components/media/DownloadButton";
import CollectButton from "@/components/media/CollectButton";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function MediaDetailsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  const media = await prisma.media.findUnique({
    where: { id: params.id },
    include: {
      author: true,
      nfts: {
        where: { userId: session?.user?.id || 'none' }
      },
      _count: {
        select: { likes: true, comments: true }
      }
    }
  });

  if (!media) return notFound();

  const isOwned = media.nfts.length > 0;

  return (
    <div style={{ padding: "6rem 2rem", maxWidth: "1200px", margin: "0 auto", color: "white" }}>
      <div className="media-header">
        <div className="media-artwork">
           {media.thumbnailUrl ? (
             <img src={media.thumbnailUrl} alt={media.title} />
           ) : (
             <div className="placeholder-artwork"><PlayCircle size={64} opacity={0.3} /></div>
           )}
           {media.isGated && <div className="gated-badge"><Lock size={16} /> NFT GATED</div>}
        </div>
        
        <div className="media-info">
          <div className="media-type">{media.type.toUpperCase()}</div>
          <h1 className="title">{media.title}</h1>
          <Link href={`/artist/${media.authorId}`} className="artist-link">
            By {media.author.name || media.author.email?.split("@")[0] || "Unknown"}
          </Link>
          
          <div style={{ marginTop: "1rem", color: "rgba(255,255,255,0.7)", maxWidth: "600px", lineHeight: "1.6" }}>
            {media.description || "No description provided."}
          </div>

          <div className="action-buttons">
              {media.price && media.price > 0 && media.tokenId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <CollectButton 
                    mediaId={media.id} 
                    tokenId={media.tokenId as string} 
                    price={media.price} 
                    isOwned={isOwned}
                  />
                  
                  {media.totalShares > 1 && (
                    <div className="fractional-info glass" style={{ padding: '1rem', borderRadius: '0.75rem', fontSize: '0.9rem', border: '1px solid var(--primary)' }}>
                      <p style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.25rem' }}>Investment Opportunity</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
                        <span>Total Shares:</span>
                        <span>{media.totalShares}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
                        <span>Holder Royalty Split:</span>
                        <span>{media.fractionalRoyalty}%</span>
                      </div>
                      <p className="hint" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                        * Holders of this NFT earn a split of all streaming revenue.
                      </p>
                    </div>
                  )}
                </div>
              )}
             <DownloadButton trackUrl={media.url} />
          </div>
        </div>
      </div>

      <MediaInteractions 
        mediaId={media.id} 
        initialLikes={media._count.likes} 
        initialPlayCount={media.playCount} 
      />

      <style>{`
        .media-header {
          display: flex;
          gap: 3rem;
          margin-bottom: 3rem;
        }
        .media-artwork {
          width: 300px;
          height: 300px;
          border-radius: 1rem;
          background: rgba(255,255,255,0.05);
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }
        .media-artwork img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .placeholder-artwork {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gated-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: #eab308;
          color: black;
          padding: 0.5rem 1rem;
          border-radius: 2rem;
          font-weight: bold;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .media-type {
          font-size: 0.9rem;
          letter-spacing: 2px;
          color: var(--primary);
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .title {
          font-size: 3.5rem;
          margin: 0 0 0.5rem 0;
          line-height: 1.1;
        }
        .artist-link {
          font-size: 1.25rem;
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          transition: 0.2s;
        }
        .artist-link:hover {
          color: white;
          text-decoration: underline;
        }
        .action-buttons {
          margin-top: 2rem;
          display: flex;
          gap: 1rem;
        }
        @media (max-width: 768px) {
          .media-header {
            flex-direction: column;
            gap: 2rem;
          }
          .media-artwork {
            width: 100%;
            aspect-ratio: 1/1;
            height: auto;
          }
          .title {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
}
