'use client';

import React, { useState, useEffect } from 'react';
import ContentCard from '@/components/ui/ContentCard';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useSession } from 'next-auth/react';
import { Music, Heart, Clock, Download, Loader2 } from 'lucide-react';

export default function LibraryPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'owned' | 'likes' | 'recent'>('owned');
  const [libraryData, setLibraryData] = useState<{
    owned: any[];
    likes: any[];
    recent: any[];
  }>({ owned: [], likes: [], recent: [] });
  const [isLoading, setIsLoading] = useState(true);

  const { setCurrentTrack, setQueue } = usePlayerStore();

  useEffect(() => {
    if (session) {
      fetch('/api/user/library')
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch library");
          return res.json();
        })
        .then(data => {
          if (data && !data.error) {
            setLibraryData({
              owned: data.owned || [],
              likes: data.likes || [],
              recent: data.recent || []
            });
            
            // Default tab navigation
            if ((data.owned?.length || 0) === 0) {
              if ((data.likes?.length || 0) > 0) setActiveTab('likes');
              else if ((data.recent?.length || 0) > 0) setActiveTab('recent');
            }
          }
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Library load error:", err);
          setIsLoading(false);
        });
    }
  }, [session]);

  const handlePlayTrack = (track: any, section: any[]) => {
    setCurrentTrack(track);
    const queueTracks = section.map(item => ({
      id: item.id,
      title: item.title,
      artist: item.author?.name || `${item.author?.address?.slice(0, 6)}...`,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      isGated: item.isGated,
      type: item.type
    }));
    setQueue(queueTracks);
  };

  if (!session) {
    return (
      <div className="library-empty">
        <Music size={64} opacity={0.2} />
        <h2>Sign in to view your library</h2>
      </div>
    );
  }

  const renderSection = (title: string, icon: any, data: any[] = [], emptyMsg: string, isList: boolean = false) => (
    <div className="library-section animate-fade-in">
      <div className="section-header">
        {icon}
        <h3>{title}</h3>
        <span className="count-badge">{data?.length || 0}</span>
      </div>
      
      {(data?.length || 0) > 0 ? (
        <div className={isList ? "list-container" : "grid-container"}>
          {data.map((item) => (
            <ContentCard 
              key={item.id} 
              id={item.id}
              title={item.title}
              artist={item.author?.name || `${item.author?.address?.slice(0, 6)}...`}
              url={item.url}
              thumbnailUrl={item.thumbnailUrl}
              isGated={item.isGated}
              type={item.type}
              layout={isList ? 'list' : 'grid'}
              onPlay={(t) => handlePlayTrack(t, data)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-card glass">
          <p>{emptyMsg}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="library-container">
      <header className="library-header">
        <h1 className="gradient-text">Your Library</h1>
        <div className="library-tabs glass">
          <button 
            className={activeTab === 'owned' ? 'active' : ''} 
            onClick={() => setActiveTab('owned')}
          >
            <Download size={18} /> Collection
          </button>
          <button 
            className={activeTab === 'likes' ? 'active' : ''} 
            onClick={() => setActiveTab('likes')}
          >
            <Heart size={18} /> Favorites
          </button>
          <button 
            className={activeTab === 'recent' ? 'active' : ''} 
            onClick={() => setActiveTab('recent')}
          >
            <Clock size={18} /> Recents
          </button>
        </div>
      </header>

      <main className="library-main">
        {isLoading ? (
          <div className="loader-box">
             <Loader2 className="animate-spin" size={40} color="var(--primary)" />
             <p>Syncing your collection...</p>
          </div>
        ) : (
          <>
            {activeTab === 'owned' && renderSection("My Collection", <Download size={24} />, libraryData.owned, "No owned items yet. Visit Explore to discover new music!")}
            {activeTab === 'likes' && renderSection("Favorites", <Heart size={24} />, libraryData.likes, "You haven't liked any songs yet.", true)}
            {activeTab === 'recent' && renderSection("Recently Played", <Clock size={24} />, libraryData.recent, "Your listening history will appear here.", true)}
          </>
        )}
      </main>

      <style jsx>{`
        .library-container {
          padding: 8rem 2rem 10rem;
          max-width: 1400px;
          margin: 0 auto;
        }
        .library-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4rem;
        }
        .library-header h1 {
          font-size: 3rem;
        }
        .library-tabs {
          display: flex;
          padding: 0.5rem;
          border-radius: 3rem;
          gap: 0.5rem;
        }
        .library-tabs button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: none;
          border: none;
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 2rem;
          cursor: pointer;
          opacity: 0.6;
          transition: var(--transition);
          font-weight: 600;
        }
        .library-tabs button:hover {
          opacity: 1;
          background: rgba(255,255,255,0.05);
        }
        .library-tabs button.active {
          opacity: 1;
          background: var(--primary);
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2.5rem;
        }
        .section-header h3 {
          font-size: 1.5rem;
          color: white;
        }
        .count-badge {
          background: rgba(255,255,255,0.1);
          padding: 0.2rem 0.6rem;
          border-radius: 1rem;
          font-size: 0.8rem;
          opacity: 0.5;
        }
        .grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2.5rem;
        }
        .list-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .empty-card {
          padding: 4rem;
          text-align: center;
          border-radius: 1.5rem;
          opacity: 0.5;
        }
        .loader-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10rem 0;
          gap: 1.5rem;
          opacity: 0.6;
        }
        .library-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
          gap: 2rem;
        }
        @media (max-width: 900px) {
          .library-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 2rem;
          }
          .library-tabs {
             width: 100%;
             justify-content: space-between;
          }
          .library-tabs button {
             padding: 0.75rem 1rem;
             flex: 1;
             justify-content: center;
             font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}
