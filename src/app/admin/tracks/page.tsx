import prisma from '@/lib/db/prisma';
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Music } from 'lucide-react';

export default async function AdminTracksPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const tracks = await prisma.media.findMany({
    include: {
      author: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="admin-tracks animate-fade-in">
      <div className="header">
        <h1>Global Tracks Tracker</h1>
        <p>Monitor all media content flowing through the network.</p>
      </div>

      <div className="glass table-container">
        <table className="content-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Artist</th>
              <th>Genre</th>
              <th>Global Plays</th>
              <th>Est. Revenue</th>
              <th>Gating Status</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map(t => (
              <tr key={t.id}>
                <td><strong>{t.title}</strong></td>
                <td>{t.author.name || t.author.email?.split("@")[0] || "Unknown"}</td>
                <td><span className="tag">{t.genre || 'None'}</span></td>
                <td>{t.playCount}</td>
                <td>${(t.playCount * 0.05).toFixed(2)}</td>
                <td>{t.isGated ? <span style={{color: '#eab308'}}>Gated</span> : "Public"}</td>
                <td><span style={{ color: '#10b981', fontWeight: 'bold' }}>Live</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .header { margin-bottom: 2rem; }
        .header h1 { margin: 0 0 0.5rem; font-size: 2.2rem; }
        .header p { opacity: 0.6; margin: 0; }
        .table-container { border-radius: 1rem; overflow-x: auto; padding: 1rem; }
        .content-table { width: 100%; border-collapse: collapse; text-align: left; }
        .content-table th { padding: 1rem; font-size: 0.8rem; color: rgba(255,255,255,0.5); text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .content-table td { padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: middle; }
        .tag { background: rgba(255,255,255,0.1); padding: 0.25rem 0.5rem; border-radius: 1rem; font-size: 0.75rem; }
      `}</style>
    </div>
  );
}
