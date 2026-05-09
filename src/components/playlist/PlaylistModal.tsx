'use client';

import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { X, Plus, Music, Check, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function PlaylistModal() {
  const { playlistModalOpen, closePlaylistModal, trackToAddToPlaylist } = useUIStore();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('/api/playlists');
      const data = await res.json();
      if (data.success) {
        setPlaylists(data.playlists);
      }
    } catch (e) {
      console.error("Failed to fetch playlists:", e);
    }
  };

  useEffect(() => {
    if (playlistModalOpen) {
      fetchPlaylists();
      setShowCreate(false);
      setNewTitle('');
    }
  }, [playlistModalOpen]);

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!trackToAddToPlaylist) return;
    setAddingTo(playlistId);
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId: trackToAddToPlaylist.id, action: 'add' })
      });
      const data = await res.json();
      if (data.success) {
        // Show success and close
        setAddingTo('success');
        setTimeout(() => {
          closePlaylistModal();
          setAddingTo(null);
        }, 1000);
      } else {
        alert(data.error || "Failed to add track");
        setAddingTo(null);
      }
    } catch (e) {
      console.error(e);
      setAddingTo(null);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      const data = await res.json();
      if (data.success) {
        setPlaylists([data.playlist, ...playlists]);
        setShowCreate(false);
        setNewTitle('');
        // Automatically add to the new playlist
        handleAddToPlaylist(data.playlist.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!playlistModalOpen) return null;

  return (
    <div className="playlist-modal-overlay animate-fade-in">
      <div className="playlist-modal glass animate-scale-in">
        <header className="modal-header">
          <div>
            <h3>Add to Playlist</h3>
            <p className="track-info">Adding: <strong>{trackToAddToPlaylist?.title}</strong></p>
          </div>
          <button onClick={closePlaylistModal} className="close-btn"><X size={20} /></button>
        </header>

        <div className="modal-body">
          {!showCreate ? (
            <>
              <button className="create-new-btn" onClick={() => setShowCreate(true)}>
                <Plus size={20} />
                <span>Create New Playlist</span>
              </button>

              <div className="playlists-list">
                {playlists.map(p => (
                  <button 
                    key={p.id} 
                    className="playlist-item" 
                    onClick={() => handleAddToPlaylist(p.id)}
                    disabled={addingTo !== null}
                  >
                    <div className="playlist-icon">
                      <Music size={18} />
                    </div>
                    <div className="playlist-details">
                      <span className="title">{p.title}</span>
                      <span className="count">{p._count?.items || 0} songs</span>
                    </div>
                    <div className="action-state">
                      {addingTo === p.id && <Loader2 className="animate-spin" size={18} />}
                      {addingTo === 'success' && <Check size={18} className="text-green-500" />}
                    </div>
                  </button>
                ))}
                {playlists.length === 0 && (
                  <p className="empty-state">No playlists yet. Create one above!</p>
                )}
              </div>
            </>
          ) : (
            <div className="create-form animate-slide-up">
              <label>Playlist Title</label>
              <input 
                type="text" 
                autoFocus
                placeholder="My Awesome Mix" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              />
              <div className="form-actions">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleCreatePlaylist} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : 'Create & Add'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .playlist-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        .playlist-modal {
          width: 90%;
          max-width: 450px;
          border-radius: 1.5rem;
          overflow: hidden;
        }
        .modal-header {
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .modal-header h3 { margin: 0; font-size: 1.25rem; }
        .track-info { margin: 0.25rem 0 0; font-size: 0.85rem; opacity: 0.6; }
        .close-btn { background: none; border: none; color: white; opacity: 0.5; cursor: pointer; transition: 0.2s; }
        .close-btn:hover { opacity: 1; transform: scale(1.1); }

        .modal-body { padding: 1.5rem; }

        .create-new-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(139, 92, 246, 0.1);
          border: 1px dashed rgba(139, 92, 246, 0.3);
          color: var(--primary);
          border-radius: 1rem;
          cursor: pointer;
          font-weight: 600;
          transition: 0.2s;
          margin-bottom: 1.5rem;
        }
        .create-new-btn:hover {
          background: rgba(139, 92, 246, 0.2);
          transform: translateY(-2px);
        }

        .playlists-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 300px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }
        .playlist-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid transparent;
          border-radius: 0.75rem;
          color: white;
          text-align: left;
          cursor: pointer;
          transition: 0.2s;
        }
        .playlist-item:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateX(5px);
        }
        .playlist-icon {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }
        .playlist-details { flex: 1; display: flex; flex-direction: column; }
        .playlist-details .title { font-weight: 600; font-size: 0.95rem; }
        .playlist-details .count { font-size: 0.75rem; opacity: 0.5; }

        .create-form { display: flex; flex-direction: column; gap: 1rem; }
        .create-form label { font-size: 0.9rem; font-weight: 600; opacity: 0.8; }
        .create-form input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem;
          border-radius: 0.75rem;
          color: white;
          outline: none;
        }
        .create-form input:focus { border-color: var(--primary); }
        .form-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem; }

        .empty-state { text-align: center; opacity: 0.4; padding: 2rem; font-style: italic; }
      `}</style>
    </div>
  );
}
