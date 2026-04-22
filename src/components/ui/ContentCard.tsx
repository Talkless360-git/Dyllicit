import { getIPFSUrl } from '@/lib/ipfs/utils';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Play, Lock } from 'lucide-react';
import Link from 'next/link';
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
    <div className={`content-card glass ${layout}`}>
      <div className="card-image-wrap" onClick={handlePlay} style={{ cursor: "pointer" }}>
        <img src={safeThumbnail} alt={title} />
        <div className="card-overlay">
          {effectiveIsGated ? <Lock size={layout === 'list' ? 20 : 32} /> : <Play size={layout === 'list' ? 20 : 32} fill="white" />}
        </div>
        {effectiveIsGated && <div className="gated-badge">{layout === 'list' ? 'GATED' : 'SUBSCRIBER GATED'}</div>}
      </div>
      
      <div className="card-info">
        <h3><Link href={`/media/${id}`} style={{ color: "white", textDecoration: "none" }}>{title}</Link></h3>
        <p>{artist}</p>
        <Link href={`/media/${id}`} style={{ fontSize: "0.8rem", color: "var(--primary)", marginTop: "0.5rem", display: "inline-block", textDecoration: "none" }}>
          View Details & Comments
        </Link>
      </div>

      <style jsx>{`
        .content-card {
           border-radius: 1rem;
           overflow: hidden;
           transition: var(--transition);
           display: flex;
           flex-direction: column;
        }
        .content-card.list {
           flex-direction: row;
           align-items: center;
           padding: 0.75rem 1rem;
           gap: 1.5rem;
        }
        .content-card:hover {
           transform: translateY(-4px);
           border-color: var(--primary);
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
           width: 60px;
           height: 60px;
           border-radius: 0.5rem;
        }
        .card-image-wrap img {
           width: 100%;
           height: 100%;
           object-fit: cover;
           transition: transform 0.5s ease;
        }
        .content-card:hover img {
           transform: scale(1.1);
        }
        .card-overlay {
           position: absolute;
           inset: 0;
           background: rgba(0, 0, 0, 0.4);
           display: flex;
           align-items: center;
           justify-content: center;
           opacity: 0;
           transition: var(--transition);
        }
        .content-card:hover .card-overlay {
           opacity: 1;
        }
        .gated-badge {
           position: absolute;
           top: 0.5rem;
           right: 0.5rem;
           background: var(--warning);
           color: black;
           font-size: 0.6rem;
           font-weight: 800;
           padding: 0.2rem 0.4rem;
           border-radius: 0.25rem;
        }
        .card-info {
           padding: 1rem;
           flex: 1;
        }
        .list .card-info {
           padding: 0;
        }
        .card-info h3 {
           font-size: 1.125rem;
           margin-bottom: 0.25rem;
           white-space: nowrap;
           overflow: hidden;
           text-overflow: ellipsis;
        }
        .list .card-info h3 {
           font-size: 1rem;
        }
        .card-info p {
           font-size: 0.9rem;
           opacity: 0.6;
        }
      `}</style>
    </div>
  );
};

export default ContentCard;
