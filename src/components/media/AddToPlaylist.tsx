"use client";

import { useState, useEffect } from "react";
import { Plus, ListPlus, Loader2, Check } from "lucide-react";
import Button from "@/components/ui/Button";

export default function AddToPlaylist({ mediaId }: { mediaId: string }) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/playlists");
      const data = await res.json();
      if (data.playlists) setPlaylists(data.playlists);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchPlaylists();
  }, [isOpen]);

  const handleAdd = async (playlistId: string) => {
    setAddingId(playlistId);
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, action: "add" })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessId(playlistId);
        setTimeout(() => setSuccessId(null), 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="add-to-playlist">
      <button className="action-btn" onClick={() => setIsOpen(!isOpen)}>
        <ListPlus size={20} />
        Add to Playlist
      </button>

      {isOpen && (
        <div className="playlist-dropdown glass animate-fade-in">
          <div className="dropdown-header">
            <h4>Your Playlists</h4>
            <button onClick={() => setIsOpen(false)}>&times;</button>
          </div>
          
          <div className="playlist-list">
            {loading ? (
              <div className="center"><Loader2 className="animate-spin" /></div>
            ) : playlists.length === 0 ? (
              <p className="empty">No playlists yet.</p>
            ) : (
              playlists.map(p => (
                <button 
                  key={p.id} 
                  className="playlist-item"
                  onClick={() => handleAdd(p.id)}
                  disabled={addingId === p.id}
                >
                  <span>{p.title}</span>
                  {addingId === p.id ? <Loader2 size={14} className="animate-spin" /> : 
                   successId === p.id ? <Check size={14} color="var(--success)" /> : <Plus size={14} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .add-to-playlist { position: relative; }
        .action-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.7);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 1rem;
          transition: 0.2s;
        }
        .action-btn:hover { color: white; }
        
        .playlist-dropdown {
          position: absolute;
          bottom: 100%;
          left: 0;
          width: 240px;
          margin-bottom: 1rem;
          border-radius: 1rem;
          padding: 1rem;
          z-index: 50;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .dropdown-header h4 { margin: 0; font-size: 0.9rem; }
        .dropdown-header button { 
          background: none; border: none; color: white; opacity: 0.5; font-size: 1.25rem; cursor: pointer;
        }
        
        .playlist-list {
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .playlist-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.6rem 0.75rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid transparent;
          border-radius: 0.5rem;
          color: white;
          font-size: 0.85rem;
          cursor: pointer;
          transition: 0.2s;
          text-align: left;
        }
        .playlist-item:hover { 
          background: rgba(255,255,255,0.08); 
          border-color: rgba(255,255,255,0.1);
        }
        .playlist-item span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .center { padding: 1rem; display: flex; justify-content: center; }
        .empty { text-align: center; font-size: 0.8rem; opacity: 0.5; padding: 1rem; }
      `}</style>
    </div>
  );
}
