'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Edit3, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function ArtistContent() {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMedia = async () => {
    const res = await fetch('/api/artist/stats');
    const data = await res.json();
    if (data.success && data.stats && data.stats.mediaDetail) {
      setMedia(data.stats.mediaDetail);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    setDeletingId(id);
    
    try {
      const res = await fetch(`/api/artist/media/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMedia(media.filter(m => m.id !== id));
      } else {
        alert("Failed to delete track");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting track.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}><Loader2 className="animate-spin" /></div>;

  return (
    <div className="content-dashboard animate-fade-in">
      <div className="header">
        <div>
          <h1>Content Management</h1>
          <p>Manage your published tracks and videos.</p>
        </div>
        <Link href="/mint">
          <Button variant="primary">Upload New</Button>
        </Link>
      </div>

      <div className="glass table-container">
        <table className="content-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Genre</th>
              <th>Streams</th>
              <th>Release Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {media.map((item) => (
              <tr key={item.id}>
                <td className="title-cell">
                  {item.thumbnailUrl && <img src={item.thumbnailUrl} alt="Cover" className="thumbnail" />}
                  <div className="title-info">
                    <strong>{item.title}</strong>
                    {item.album && <span>{item.album}</span>}
                  </div>
                </td>
                <td className="tag-cell"><span className="tag">{item.type.toUpperCase()}</span></td>
                <td>{item.genre || 'Uncategorized'}</td>
                <td>{item.playCount}</td>
                <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                <td className="actions-cell">
                  {/* For brevity we use browser prompts, normally this would trigger a Modal */}
                  <Button variant="glass" size="sm" onClick={() => alert("Edit modal functionality coming soon!")}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="glass" size="sm" onClick={() => handleDelete(item.id, item.title)} disabled={deletingId === item.id}>
                    {deletingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} color="#ef4444" />}
                  </Button>
                </td>
              </tr>
            ))}
            {media.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">No content uploaded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .header h1 { margin: 0 0 0.5rem; }
        .header p { opacity: 0.6; margin: 0; }
        .table-container {
          border-radius: 1rem;
          padding: 1rem;
          overflow-x: auto;
        }
        .content-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .content-table th {
          padding: 1rem;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          font-size: 0.8rem;
          letter-spacing: 1px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .content-table td {
          padding: 1rem;
          vertical-align: middle;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .content-table tr:last-child td {
          border-bottom: none;
        }
        .title-cell {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .thumbnail {
          width: 40px;
          height: 40px;
          border-radius: 0.5rem;
          object-fit: cover;
        }
        .title-info {
          display: flex;
          flex-direction: column;
        }
        .title-info span {
          font-size: 0.8rem;
          opacity: 0.5;
        }
        .tag {
          background: rgba(255,255,255,0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .actions-cell {
          display: flex;
          gap: 0.5rem;
        }
        .empty-state {
          text-align: center;
          padding: 3rem !important;
          opacity: 0.5;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
