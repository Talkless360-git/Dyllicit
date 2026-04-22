'use client';

import React, { useState } from 'react';
import ContentCard from '@/components/ui/ContentCard';
import { Search, Filter, LayoutGrid, List } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';

export default function ExplorePage() {
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
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
  }, []);

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
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      isGated: item.isGated,
      type: item.type
    }));
    setQueue(queueTracks);
  };

  return (
    <div className="explore-container animate-fade-in">
      <header className="explore-header">
        <h1>Explore Content</h1>
        <div className="search-bar glass">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Search artists, tracks, or videos..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <section className="filter-section">
        <div className="filter-controls">
          <div className="filter-tabs">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
            <button className={filter === 'free' ? 'active' : ''} onClick={() => setFilter('free')}>Public</button>
            <button className={filter === 'gated' ? 'active' : ''} onClick={() => setFilter('gated')}>NFT Gated</button>
          </div>

          <div className="type-select glass">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">Format: Any</option>
              <option value="audio">Format: Audio</option>
              <option value="video">Format: Video</option>
            </select>
          </div>
          
          <div className="view-toggle glass">
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
        <button className="filter-btn glass"><Filter size={16} /> Filters</button>
      </section>

      <main className={`content-display ${viewMode}`}>
        {isLoading ? (
          <div className="loading-state">Syncing with blockchain...</div>
        ) : filteredData.length > 0 ? (
          filteredData.map((item) => (
            <ContentCard 
              key={item.id} 
              id={item.id}
              title={item.title}
              artist={item.author?.name || `${item.author?.address?.slice(0, 6)}...`}
              url={item.url}
              thumbnailUrl={item.thumbnailUrl}
              isGated={item.isGated}
              type={item.type}
              layout={viewMode}
              onPlay={handlePlayTrack}
            />
          ))
        ) : (
          <div className="empty-state">No content found. Be the first to upload!</div>
        )}
      </main>

      <style jsx>{`
        .explore-container {
          padding: 8rem 2rem 10rem;
          max-width: 1400px;
          margin: 0 auto;
        }
        .explore-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
        }
        .explore-header h1 {
          font-size: 2.5rem;
        }
        .search-bar {
          display: flex;
          align-items: center;
          padding: 0.75rem 1.5rem;
          width: 400px;
          border-radius: 2rem;
        }
        .search-bar input {
          background: none;
          border: none;
          color: white;
          margin-left: 0.75rem;
          width: 100%;
          outline: none;
          font-size: 1rem;
        }
        .filter-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3rem;
          align-items: center;
        }
        .filter-controls {
          display: flex;
          gap: 2rem;
          align-items: center;
        }
        .filter-tabs {
          display: flex;
          gap: 1rem;
        }
        .filter-tabs button {
          background: none;
          border: none;
          color: white;
          padding: 0.5rem 1.5rem;
          border-radius: 2rem;
          cursor: pointer;
          opacity: 0.6;
          transition: var(--transition);
        }
        .filter-tabs button:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.05);
        }
        .filter-tabs button.active {
          opacity: 1;
          background: var(--primary);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
        .type-select select {
          background: transparent;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          outline: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .type-select select option {
          background: #111;
        }
        .view-toggle {
          display: flex;
          padding: 0.25rem;
          border-radius: 0.75rem;
          gap: 0.25rem;
        }
        .view-toggle button {
          background: none;
          border: none;
          color: white;
          padding: 0.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          opacity: 0.5;
          transition: var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .view-toggle button:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.05);
        }
        .view-toggle button.active {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
          color: var(--primary);
        }
        .filter-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1.25rem;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: var(--transition);
        }
        .content-display.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2.5rem;
        }
        .content-display.list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        @media (max-width: 768px) {
          .explore-header {
            flex-direction: column;
            gap: 1.5rem;
            align-items: flex-start;
          }
          .search-bar {
            width: 100%;
          }
          .filter-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.5rem;
          }
          .filter-controls {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
