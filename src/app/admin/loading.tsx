'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminLoading() {
  return (
    <div className="admin-loading-screen">
      <div className="loader-box glass">
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        <h2>Dyllicit Admin Hub</h2>
        <p>Synchronizing with blockchain network...</p>
      </div>
      <style jsx>{`
        .admin-loading-screen {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #050505;
          color: white;
          width: 100%;
        }
        .loader-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          padding: 3rem;
          border-radius: 1.5rem;
          text-align: center;
        }
        h2 { margin: 0; font-weight: 800; letter-spacing: -1px; }
        p { opacity: 0.4; margin: 0; }
      `}</style>
    </div>
  );
}
