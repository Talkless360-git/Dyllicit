'use client';

import React, { useState } from 'react';
import ContentCard from '@/components/ui/ContentCard';
import { Search, Filter, LayoutGrid, List, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { usePlayerStore } from '@/store/usePlayerStore';

export default function ExplorePage() {
  const { data: session } = useSession();
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    setIsLoading(true);
    fetch('/api/media')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMediaList(data);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch media:", err);
        setIsLoading(false);
      });
  }, [session?.user?.isSubscribed]);

  const filteredData = mediaList.filter(item => {
    // Safely handle missing author data
    const artistName = item.author?.name || item.author?.address || 'Anonymous';
    
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          artistName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || 
                          (filter === 'gated' && item.isGated) || 
                          (filter === 'free' && !item.isGated);
    const matchesType = typeFilter === 'all' || item.type === typeFilter;

    return matchesSearch && matchesFilter && matchesType;
  });

  const { setCurrentTrack, setQueue } = usePlayerStore();

  const handlePlayTrack = (track: any) => {
    setCurrentTrack(track);
    // Set the filtered data as the queue, mapping it to the flat track structure
    const queueTracks = filteredData.map(item => ({
      id: item.id,
      title: item.title,
      artist: item.author?.name || `${item.author?.address?.slice(0, 6)}...`,
      authorId: item.authorId,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      isGated: item.isGated,
      type: item.type,
      tokenId: item.nft?.tokenId
    }));
    setQueue(queueTracks);
  };

  return (
    <div className="explore-container animate-fade-in">
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>
      
      <header className="explore-header">
        <div className="title-section">
          <span className="subtitle">DISCOVER THE FUTURE</span>
          <h1>Explore Universe</h1>
        </div>
        <div className="search-bar-wrap">
          <div className="search-bar glass-pill">
            <Search size={20} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search artists, tracks, or videos..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <section className="filter-section">
        <div className="filter-controls">
          <div className="segmented-control glass">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
            <button className={filter === 'free' ? 'active' : ''} onClick={() => setFilter('free')}>Public</button>
            <button className={filter === 'gated' ? 'active' : ''} onClick={() => setFilter('gated')}>NFT Gated</button>
          </div>

          <div className="type-select glass-pill">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">Any Format</option>
              <option value="audio">Audio Only</option>
              <option value="video">Video Only</option>
            </select>
          </div>
          
          <div className="view-toggle glass-pill">
            <button 
              className={viewMode === 'grid' ? 'active' : ''} 
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''} 
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>
        </div>
        <button className="filter-btn glass-pill"><Filter size={16} /> Advanced</button>
      </section>

      <main className={`content-display ${viewMode}`}>
        {isLoading ? (
          <div className="loading-state">
            <Loader2 className="animate-spin" size={40} />
            <p>Syncing with blockchain...</p>
          </div>
        ) : filteredData.length > 0 ? (
          filteredData.map((item) => (
            <ContentCard 
              key={item.id} 
              id={item.id}
              title={item.title}
              artist={item.author?.name || `${item.author?.address?.slice(0, 6)}...`}
              authorId={item.authorId}
              url={item.url}
              thumbnailUrl={item.thumbnailUrl}
              isGated={item.isGated}
              type={item.type}
              tokenId={item.nft?.tokenId}
              layout={viewMode}
              onPlay={handlePlayTrack}
            />
          ))
        ) : (
          <div className="empty-state glass">
            <Search size={48} opacity={0.2} />
            <p>No content found matching your search.</p>
          </div>
        )}
      </main>

      <style jsx>{`
        .explore-container {
          padding: 8rem 2rem 10rem;
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
        }
        
        .ambient-glow-1 {
          position: absolute;
          top: -100px;
          right: -100px;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
          filter: blur(60px);
          z-index: -1;
          pointer-events: none;
        }
        
        .ambient-glow-2 {
          position: absolute;
          top: 20%;
          left: -150px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
          filter: blur(80px);
          z-index: -1;
          pointer-events: none;
        }

        .explore-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 4rem;
        }

        .title-section h1 {
          font-size: 4rem;
          font-weight: 800;
          letter-spacing: -2px;
          margin: 0;
          background: linear-gradient(to bottom, #fff, #999);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: var(--primary);
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 3px;
          display: block;
          margin-bottom: 0.5rem;
        }

        .search-bar-wrap {
          width: 450px;
        }

        .glass-pill {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 3rem;
          transition: all 0.3s ease;
        }

        .glass-pill:focus-within {
          background: rgba(255, 255, 255, 0.06);
          border-color: var(--primary);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
        }

        .search-bar {
          display: flex;
          align-items: center;
          padding: 0.85rem 1.75rem;
        }

        .search-icon {
          color: rgba(255, 255, 255, 0.4);
          transition: color 0.3s ease;
        }

        .glass-pill:focus-within .search-icon {
          color: var(--primary);
        }

        .search-bar input {
          background: none;
          border: none;
          color: white;
          margin-left: 1rem;
          width: 100%;
          outline: none;
          font-size: 1.1rem;
        }

        .filter-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3.5rem;
          align-items: center;
        }

        .filter-controls {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }

        .segmented-control {
          display: flex;
          padding: 0.35rem;
          border-radius: 3rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .segmented-control button {
          background: none;
          border: none;
          color: white;
          padding: 0.6rem 2rem;
          border-radius: 2rem;
          cursor: pointer;
          font-weight: 600;
          opacity: 0.5;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .segmented-control button:hover {
          opacity: 0.8;
        }

        .segmented-control button.active {
          opacity: 1;
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
        }

        .type-select select {
          background: transparent;
          color: white;
          border: none;
          padding: 0.6rem 1.5rem;
          outline: none;
          cursor: pointer;
          font-weight: 600;
        }

        .type-select select option {
          background: #111;
        }

        .view-toggle {
          display: flex;
          padding: 0.35rem;
          gap: 0.35rem;
        }

        .view-toggle button {
          background: none;
          border: none;
          color: white;
          padding: 0.6rem;
          border-radius: 2rem;
          cursor: pointer;
          opacity: 0.4;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .view-toggle button.active {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
          color: var(--primary);
        }

        .filter-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 2rem;
          cursor: pointer;
          font-weight: 600;
        }

        .content-display.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 3rem;
        }

        .content-display.list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8rem;
          gap: 1.5rem;
          opacity: 0.6;
        }

        .empty-state {
          padding: 6rem;
          text-align: center;
          border-radius: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .empty-state p {
          opacity: 0.5;
          font-size: 1.2rem;
        }

        @media (max-width: 1024px) {
          .explore-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 2rem;
          }
          .search-bar-wrap {
            width: 100%;
          }
        }

        @media (max-width: 768px) {
          .title-section h1 {
            font-size: 3rem;
          }
          .filter-section {
            flex-direction: column;
            gap: 2rem;
            align-items: flex-start;
          }
          .filter-controls {
            flex-direction: column;
            width: 100%;
            align-items: stretch;
          }
          .segmented-control {
            justify-content: space-between;
          }
          .segmented-control button {
            padding: 0.6rem 1rem;
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
