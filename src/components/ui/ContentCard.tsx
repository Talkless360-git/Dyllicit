import { getIPFSUrl } from '@/lib/ipfs/utils';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Play, Lock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

interface ContentCardProps {
  id: string;
  title: string;
  artist: string;
  authorId?: string;
  thumbnailUrl?: string;
  url: string | null;
  isGated: boolean;
  type: 'audio' | 'video';
  layout?: 'grid' | 'list';
  onPlay?: (track: any) => void;
}

const ContentCard: React.FC<ContentCardProps> = ({ 
  id, title, artist, authorId, thumbnailUrl, url, isGated: originalIsGated, type, layout = 'grid', onPlay
}) => {
  const { data: session } = useSession();
  const { setCurrentTrack } = usePlayerStore();
  const safeThumbnail = getIPFSUrl(thumbnailUrl) || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop';

  const isSubscriber = session?.user?.isSubscribed;
  const isAuthor = !!session?.user?.id && !!authorId && session.user.id === authorId;
  
  // All tracks are gated unless the user is a subscriber or the author
  const effectiveIsGated = !isSubscriber && !isAuthor;

  const handlePlay = () => {
    if (effectiveIsGated && !url) {
      alert("This content is Gated. You need a subscription to play it.");
      return;
    }
    const track = { 
      id, title, artist, authorId, 
      url: url || '', thumbnailUrl: safeThumbnail, 
      type, isGated: effectiveIsGated 
    };
    if (onPlay) {
      onPlay(track);
    } else {
      setCurrentTrack(track);
    }
  };

  return (
    <div className={`content-card premium-glass ${layout}`}>
      <div className="card-image-wrap" onClick={handlePlay} style={{ cursor: "pointer" }}>
        <Image src={safeThumbnail} alt={title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="main-image" />
        <div className="card-overlay">
          <div className="play-icon-wrap">
            {effectiveIsGated ? <Lock size={layout === 'list' ? 18 : 28} /> : <Play size={layout === 'list' ? 18 : 28} fill="white" />}
          </div>
        </div>
        {effectiveIsGated && (
          <div className="gated-pill-wrap">
             <div className="gated-pill">{layout === 'list' ? 'GATED' : 'SUBSCRIBER GATED'}</div>
          </div>
        )}
      </div>
      
      <div className="card-info">
        <div className="info-top">
          <h3><Link href={`/media/${id}`} className="track-title">{title}</Link></h3>
          <p className="artist-name">{artist}</p>
        </div>
        <div className="info-bottom">
           <Link href={`/media/${id}`} className="details-link">
            Explore & Community
          </Link>
        </div>
      </div>

      <style jsx>{`
        .content-card {
           border-radius: 1.5rem;
           overflow: hidden;
           transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
           display: flex;
           flex-direction: column;
           background: rgba(255, 255, 255, 0.03);
           border: 1px solid rgba(255, 255, 255, 0.06);
           position: relative;
        }

        .premium-glass {
           backdrop-filter: blur(12px);
           box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        }
        
        .content-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          pointer-events: none;
        }

        .content-card.list {
           flex-direction: row;
           align-items: center;
           padding: 0.85rem 1.25rem;
           gap: 1.5rem;
        }

        .content-card:hover {
           transform: translateY(-8px);
           background: rgba(255, 255, 255, 0.07);
           border-color: rgba(139, 92, 246, 0.3);
           box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(139, 92, 246, 0.15);
        }

        .card-image-wrap {
           position: relative;
           aspect-ratio: 1/1;
           overflow: hidden;
           flex-shrink: 0;
        }

        .grid .card-image-wrap {
           width: 100%;
        }

        .list .card-image-wrap {
           width: 70px;
           height: 70px;
           border-radius: 1rem;
        }

        :global(.main-image) {
           transition: transform 0.8s cubic-bezier(0.2, 0, 0.2, 1) !important;
        }

        .content-card:hover :global(.main-image) {
           transform: scale(1.1) rotate(1deg);
        }

        .card-overlay {
           position: absolute;
           inset: 0;
           background: rgba(0, 0, 0, 0.3);
           display: flex;
           align-items: center;
           justify-content: center;
           opacity: 0;
           transition: all 0.4s ease;
           backdrop-filter: blur(2px);
        }

        .content-card:hover .card-overlay {
           opacity: 1;
        }

        .play-icon-wrap {
          transform: scale(0.5);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          background: var(--primary);
          padding: 1.25rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        }
        
        .list .play-icon-wrap {
          padding: 0.75rem;
        }

        .content-card:hover .play-icon-wrap {
          transform: scale(1);
        }

        .gated-pill-wrap {
           position: absolute;
           top: 1rem;
           right: 1rem;
           z-index: 2;
        }

        .list .gated-pill-wrap {
          top: -0.5rem;
          right: -0.5rem;
        }

        .gated-pill {
           background: rgba(234, 179, 8, 0.9);
           color: black;
           font-size: 0.65rem;
           font-weight: 800;
           padding: 0.35rem 0.75rem;
           border-radius: 2rem;
           text-transform: uppercase;
           letter-spacing: 1px;
           box-shadow: 0 4px 15px rgba(234, 179, 8, 0.4);
           backdrop-filter: blur(4px);
        }

        .card-info {
           padding: 1.5rem;
           flex: 1;
           display: flex;
           flex-direction: column;
           justify-content: space-between;
        }

        .list .card-info {
           padding: 0;
           flex-direction: row;
           align-items: center;
        }

        .info-top {
          margin-bottom: 1.5rem;
        }
        
        .list .info-top {
          margin-bottom: 0;
        }

        .track-title {
           color: white;
           text-decoration: none;
           font-size: 1.25rem;
           font-weight: 700;
           margin-bottom: 0.35rem;
           display: block;
           white-space: nowrap;
           overflow: hidden;
           text-overflow: ellipsis;
           transition: color 0.3s ease;
        }

        .track-title:hover {
          color: var(--primary);
        }

        .list .track-title {
           font-size: 1.1rem;
        }

        .artist-name {
           font-size: 0.95rem;
           opacity: 0.5;
           font-weight: 500;
        }

        .details-link {
           font-size: 0.85rem;
           color: var(--primary);
           text-decoration: none;
           font-weight: 600;
           opacity: 0.8;
           transition: all 0.3s ease;
           display: flex;
           align-items: center;
           gap: 0.5rem;
        }

        .details-link:hover {
           opacity: 1;
           transform: translateX(5px);
        }

        .list .details-link {
          margin-left: auto;
          background: rgba(255,255,255,0.05);
          padding: 0.5rem 1rem;
          border-radius: 2rem;
        }
      `}</style>
    </div>
  );
};

export default ContentCard;
