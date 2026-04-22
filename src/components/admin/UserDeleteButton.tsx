'use client';

import React, { useState } from 'react';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserDeleteButtonProps {
  userId: string;
  userName: string;
  isSelf: boolean;
}

export default function UserDeleteButton({ userId, userName, isSelf }: UserDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (isSelf) {
    return <span className="self-label">Current Admin</span>;
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.refresh(); // Refresh RSC server data
        setShowConfirm(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete user');
      }
    } catch (err) {
      setError('Connection error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="delete-action-container">
      {!showConfirm ? (
        <button 
          className="btn-icon delete" 
          onClick={() => setShowConfirm(true)}
          title="Delete User"
        >
          <Trash2 size={18} />
        </button>
      ) : (
        <div className="confirm-bubble glass animate-scale-up">
          <AlertTriangle size={16} color="#ef4444" />
          <div className="confirm-text">
            Delete <strong>{userName}</strong>?
            {error && <div className="error-hint">{error}</div>}
          </div>
          <div className="confirm-actions">
            <button 
              className="confirm-btn delete" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="animate-spin" size={14} /> : 'Yes, Delete'}
            </button>
            <button 
              className="confirm-btn cancel" 
              onClick={() => { setShowConfirm(false); setError(null); }}
              disabled={isDeleting}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .delete-action-container {
          position: relative;
          display: flex;
          justify-content: flex-end;
        }
        .btn-icon {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.5);
          padding: 0.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon.delete:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.2);
        }
        .self-label {
          font-size: 0.75rem;
          opacity: 0.4;
          font-style: italic;
        }
        .confirm-bubble {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          z-index: 100;
          background: #1a1a1a;
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 1rem;
          padding: 1rem;
          width: 220px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .confirm-text {
          font-size: 0.85rem;
          line-height: 1.4;
          color: white;
        }
        .error-hint {
          color: #ef4444;
          font-size: 0.75rem;
          margin-top: 0.25rem;
          font-weight: 600;
        }
        .confirm-actions {
          display: flex;
          gap: 0.5rem;
        }
        .confirm-btn {
          flex: 1;
          border: none;
          padding: 0.4rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }
        .confirm-btn.delete {
          background: #ef4444;
          color: white;
        }
        .confirm-btn.cancel {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
      `}</style>
    </div>
  );
}
