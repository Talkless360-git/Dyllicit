import prisma from '@/lib/db/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserDeleteButton from "@/components/admin/UserDeleteButton";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/explore');
  }

  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: { media: true, streams: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="admin-users animate-fade-in">
      <div className="header">
        <h1>User Administration</h1>
        <p>Manage listeners and artists explicitly here.</p>
      </div>

      <div className="glass table-container">
        <table className="content-table">
          <thead>
            <tr>
              <th>Node ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Uploaded Tracks</th>
              <th>Total Streams (Authored)</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="monospace">...{u.id.slice(-8)}</td>
                <td>
                  <div className="user-name">{u.name || (u.email ? u.email.split("@")[0] : 'Unknown')}</div>
                  <div className="user-email">{u.email || u.address || 'No identity'}</div>
                </td>
                <td><span className={`role-badge ${u.role.toLowerCase()}`}>{u.role}</span></td>
                <td>{u._count.media}</td>
                <td>{u._count.streams}</td>
                <td>
                   <span style={{ color: '#10b981', fontWeight: 'bold' }}>Active</span>
                </td>
                <td>
                   <UserDeleteButton 
                     userId={u.id} 
                     userName={u.name || 'User'} 
                     isSelf={u.id === session.user.id} 
                   />
                </td>
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
        .monospace { font-family: monospace; opacity: 0.7; }
        .user-name { font-weight: bold; margin-bottom: 0.25rem; }
        .user-email { font-size: 0.8rem; opacity: 0.5; }
        .role-badge { padding: 0.25rem 0.5rem; border-radius: 2rem; font-size: 0.75rem; font-weight: bold; background: rgba(255,255,255,0.1); }
        .role-badge.artist { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
        .role-badge.admin { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
      `}</style>
    </div>
  );
}
