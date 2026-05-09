'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useSession } from 'next-auth/react';
import { Play, Music, Clock, Trash2, Loader2, ArrowLeft, MoreVertical, Share2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { getIPFSUrl } from '@/lib/ipfs/utils';

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { setCurrentTrack, setQueue } = usePlayerStore();
  
  const [playlist, setPlaylist] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/playlists/${params.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setPlaylist(data.playlist);
          } else {
            console.error(data.error);
          }
          setIsLoading(false);
        })
        .catch(err => {
          console.error(err);
          setIsLoading(false);
        });
    }
  }, [params.id]);

  const handlePlayPlaylist = (startIndex = 0) => {
    if (!playlist || !playlist.items.length) return;
    
    const tracks = playlist.items.map((item: any) => ({
      id: item.media.id,
      title: item.media.title,
      artist: item.media.author?.name || 'Unknown Artist',
      authorId: item.media.authorId,
      url: item.media.url,
      thumbnailUrl: item.media.thumbnailUrl,
      isGated: item.media.isGated,
      type: item.media.type,
      tokenId: item.media.tokenId
    }));

    setQueue(tracks);
    setCurrentTrack(tracks[startIndex]);
  };

  const handleRemoveFromPlaylist = async (mediaId: string) => {
    if (!confirm("Remove this song from the playlist?")) return;
    
    try {
      const res = await fetch(`/api/playlists/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, action: 'remove' })
      });
      if (res.ok) {
        setPlaylist({
          ...playlist,
          items: playlist.items.filter((item: any) => item.mediaId !== mediaId)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!confirm("Are you sure you want to delete this entire playlist?")) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/playlists/${params.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        router.push('/library');
      }
    } catch (e) {
      console.error(e);
      setIsDeleting(false);
    }
  };

  if (isLoading) return (
    <div className="playlist-detail-container flex items-center justify-center" style={{ height: '80vh' }}>
      <Loader2 className="animate-spin" size={48} color="var(--primary)" />
    </div>
  );

  if (!playlist) return (
    <div className="playlist-detail-container flex flex-col items-center justify-center" style={{ height: '80vh' }}>
      <h2>Playlist not found</h2>
      <Button onClick={() => router.push('/library')}>Back to Library</Button>
    </div>
  );

  const isOwner = session?.user?.id === playlist.userId;

  return (
    <div className="playlist-detail-container">
      <header className="playlist-header">
        <button onClick={() => router.back()} className="back-btn">
          <ArrowLeft size={24} />
        </button>
        
        <div className="playlist-meta-grid">
          <div className="playlist-cover-large glass">
            <Music size={80} opacity={0.1} />
          </div>
          <div className="playlist-info-main">
            <span className="type-label">Playlist</span>
            <h1>{playlist.title}</h1>
            <div className="user-meta">
              <span className="owner-name">{playlist.user?.name || 'User'}</span>
              <span className="dot">•</span>
              <span>{playlist.items.length} songs</span>
            </div>
            
            <div className="playlist-actions">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={() => handlePlayPlaylist()}
                disabled={!playlist.items.length}
              >
                <Play fill="black" size={20} /> Play
              </Button>
              {isOwner && (
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={handleDeletePlaylist}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 size={20} />}
                </Button>
              )}
              <Button variant="outline" size="lg"><Share2 size={20} /></Button>
            </div>
          </div>
        </div>
      </header>

      <main className="playlist-content">
        <div className="tracklist-header glass">
          <div className="col-num">#</div>
          <div className="col-title">Title</div>
          <div className="col-artist">Artist</div>
          <div className="col-actions"></div>
        </div>

        <div className="tracklist-body">
          {playlist.items.map((item: any, index: number) => (
            <div key={item.id} className="track-row" onClick={() => handlePlayPlaylist(index)}>
              <div className="col-num">{index + 1}</div>
              <div className="col-title">
                <img 
                  src={getIPFSUrl(item.media.thumbnailUrl) || '/placeholder-music.jpg'} 
                  alt={item.media.title} 
                  className="track-thumb"
                />
                <div className="track-names">
                  <span className="title">{item.media.title}</span>
                  <span className="mobile-artist">{item.media.author?.name}</span>
                </div>
              </div>
              <div className="col-artist">{item.media.author?.name}</div>
              <div className="col-actions">
                {isOwner && (
                  <button 
                    className="remove-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromPlaylist(item.mediaId);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {playlist.items.length === 0 && (
            <div className="empty-tracklist">
              <Music size={48} opacity={0.1} />
              <p>This playlist is empty.</p>
              <Button variant="outline" onClick={() => router.push('/explore')}>Discover Music</Button>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .playlist-detail-container {
          padding: 8rem 2rem 10rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .back-btn {
          background: rgba(255,255,255,0.05);
          border: none;
          color: white;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
          cursor: pointer;
          transition: 0.2s;
        }
        .back-btn:hover { background: rgba(255,255,255,0.1); }

        .playlist-meta-grid {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 3rem;
          align-items: flex-end;
          margin-bottom: 4rem;
        }
        .playlist-cover-large {
          aspect-ratio: 1/1;
          border-radius: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.05));
          border: 1px solid rgba(139, 92, 246, 0.2);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .playlist-info-main .type-label {
          text-transform: uppercase;
          font-weight: 800;
          font-size: 0.8rem;
          letter-spacing: 2px;
          opacity: 0.6;
        }
        .playlist-info-main h1 {
          font-size: 4.5rem;
          margin: 0.5rem 0 1.5rem 0;
          line-height: 1;
        }
        .user-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
          margin-bottom: 2rem;
        }
        .owner-name { color: var(--primary); }
        .dot { opacity: 0.3; }

        .playlist-actions {
          display: flex;
          gap: 1rem;
        }

        .tracklist-header {
          display: grid;
          grid-template-columns: 50px 1fr 1fr 100px;
          padding: 1rem 1.5rem;
          border-radius: 1rem 1rem 0 0;
          font-size: 0.8rem;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 1px;
          opacity: 0.5;
          margin-bottom: 1rem;
        }
        
        .track-row {
          display: grid;
          grid-template-columns: 50px 1fr 1fr 100px;
          padding: 0.75rem 1.5rem;
          border-radius: 0.75rem;
          align-items: center;
          cursor: pointer;
          transition: 0.2s;
        }
        .track-row:hover {
          background: rgba(255,255,255,0.05);
        }
        .col-num { opacity: 0.5; font-variant-numeric: tabular-nums; }
        .col-title { display: flex; align-items: center; gap: 1rem; }
        .track-thumb { width: 40px; height: 40px; border-radius: 0.4rem; object-fit: cover; }
        .track-names { display: flex; flex-direction: column; }
        .track-names .title { font-weight: 600; }
        .mobile-artist { display: none; font-size: 0.75rem; opacity: 0.5; }
        .col-artist { opacity: 0.7; }
        .remove-btn {
          background: none;
          border: none;
          color: #ef4444;
          opacity: 0;
          cursor: pointer;
          transition: 0.2s;
        }
        .track-row:hover .remove-btn { opacity: 0.6; }
        .remove-btn:hover { opacity: 1 !important; transform: scale(1.2); }

        .empty-tracklist {
          padding: 6rem 0;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          opacity: 0.5;
        }

        @media (max-width: 900px) {
          .playlist-meta-grid {
            grid-template-columns: 1fr;
            text-align: center;
            justify-items: center;
          }
          .playlist-info-main h1 { font-size: 3rem; }
          .user-meta, .playlist-actions { justify-content: center; }
          .col-artist, .tracklist-header .col-artist { display: none; }
          .track-row, .tracklist-header { grid-template-columns: 40px 1fr 60px; }
          .mobile-artist { display: block; }
        }
      `}</style>
    </div>
  );
}
