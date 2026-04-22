'use client';

import React, { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session.user?.role === 'ADMIN') {
      router.push('/admin');
    }
  }, [status, session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('admin-credentials', {
      redirect: false,
      username,
      password,
    });

    if (res?.error) {
      setError('Invalid admin credentials. Access denied.');
      setLoading(false);
    } else {
      router.push('/admin');
    }
  };

  return (
    <div className="admin-login-wrapper">
      <form className="admin-login-box glass animate-fade-in" onSubmit={handleLogin}>
        <div className="icon">
          <ShieldCheck size={48} color="var(--primary)" />
        </div>
        <h2>Admin Authentication</h2>
        <p>Restricted access for system administrators.</p>

        {error && <div className="error-box">{error}</div>}

        <div className="form-group">
          <label>Username</label>
          <input 
            type="text" 
            autoComplete="off"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label>Secret Key</label>
          <input 
            type="password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <Button variant="primary" size="lg" fullWidth type="submit" disabled={loading}>
          {loading ? <Loader2 size={20} className="animate-spin" /> : "Authenticate"}
        </Button>
      </form>

      <style jsx>{`
        .admin-login-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #020202;
          width: 100%;
        }
        .admin-login-box {
          width: 100%;
          max-width: 450px;
          padding: 3rem;
          border-radius: 1rem;
          text-align: center;
          background: rgba(10, 10, 15, 0.9);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .icon {
          margin-bottom: 1.5rem;
          background: rgba(139, 92, 246, 0.1);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-inline: auto;
        }
        h2 { margin: 0 0 0.5rem; border: none; padding: 0; }
        p { color: rgba(255,255,255,0.5); font-size: 0.9rem; margin-bottom: 2.5rem; }
        .error-box {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 1rem;
          border-radius: 0.5rem;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
          font-weight: 500;
        }
        .form-group {
          text-align: left;
          margin-bottom: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        label { font-weight: bold; opacity: 0.7; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;}
        input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 1rem;
          border-radius: 0.5rem;
          color: white;
          outline: none;
          transition: 0.2s;
        }
        input:focus {
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
}
