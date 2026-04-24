'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { Settings, Save, Wallet, User as UserIcon, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSession } from 'next-auth/react';

export default function ArtistSettings() {
  const { user } = useAuthStore();
  const { update: updateSession } = useSession();
  
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    payoutAddress: '',
    twitter: '',
    instagram: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '', 
        payoutAddress: user.payoutAddress || '',
        twitter: user.twitter || '',
        instagram: user.instagram || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setSuccess(true);
        // Refresh the session to reflect role/name changes globally
        await updateSession();
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="artist-settings animate-fade-in">
      <header className="page-header">
        <h1>Artist Settings</h1>
        <p>Manage your profile and payout configuration.</p>
      </header>

      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="form-sections">
          <section className="settings-section glass">
            <div className="section-header">
              <UserIcon size={20} />
              <h3>Profile Information</h3>
            </div>
            
            <div className="form-group">
              <label>Artist Name</label>
              <input 
                type="text" 
                value={formData.name}
                placeholder="e.g. Nexus One"
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea 
                rows={4}
                value={formData.bio}
                placeholder="Tell the world about your music..."
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
              ></textarea>
            </div>

            <div className="form-group">
              <label>Twitter Link</label>
              <input 
                type="text" 
                value={formData.twitter}
                placeholder="https://twitter.com/..."
                onChange={(e) => setFormData({...formData, twitter: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Instagram Link</label>
              <input 
                type="text" 
                value={formData.instagram}
                placeholder="https://instagram.com/..."
                onChange={(e) => setFormData({...formData, instagram: e.target.value})}
              />
            </div>
          </section>

          <section className="settings-section glass highlight">
            <div className="section-header">
              <Wallet size={20} />
              <h3>Royalty & Payouts</h3>
            </div>

            <div className="form-group">
              <label>Payout Wallet Address</label>
              <input 
                type="text" 
                value={formData.payoutAddress}
                placeholder="0x..."
                className="monospace"
                onChange={(e) => setFormData({...formData, payoutAddress: e.target.value})}
              />
              <p className="hint">If empty, royalties will be sent to your connected login address: <strong>{user?.address.slice(0, 10)}...</strong></p>
            </div>

            <div className="info-box">
              <CheckCircle size={16} />
              <p>On-chain royalties are distributed automatically through the Dyllicit smart contract protocol.</p>
            </div>
          </section>
        </div>

        <div className="form-actions">
          {success && <span className="success-msg">Profile updated successfully!</span>}
          <Button variant="primary" size="lg" type="submit" disabled={loading}>
            {loading ? 'Saving...' : <><Save size={20} /> Save Changes</>}
          </Button>
        </div>
      </form>

      <style jsx>{`
        .page-header {
          margin-bottom: 3.5rem;
        }
        .page-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .page-header p {
          opacity: 0.5;
        }
        .form-sections {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }
        .settings-section {
          padding: 2.5rem;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
          color: var(--primary);
        }
        .form-group {
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        label {
          font-weight: 600;
          font-size: 0.9rem;
          opacity: 0.7;
        }
        input, textarea {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--glass-border);
          border-radius: 0.75rem;
          padding: 0.85rem 1rem;
          color: white;
          outline: none;
          transition: var(--transition);
        }
        input:focus, textarea:focus {
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.08);
        }
        .monospace {
          font-family: monospace;
          color: var(--primary);
          font-size: 0.9rem;
        }
        .hint {
          font-size: 0.8rem;
          opacity: 0.4;
          margin-top: 0.5rem;
        }
        .info-box {
          margin-top: 2rem;
          padding: 1rem;
          background: rgba(139, 92, 246, 0.1);
          border-radius: 0.75rem;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
        }
        .form-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 2rem;
        }
        .success-msg {
          color: #10b981;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
