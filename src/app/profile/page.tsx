import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlayCircle, User as UserIcon, Star, Heart, CheckCircle } from "lucide-react";

export default async function ProfileDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.id) {
    redirect("/explore");
  }

  // Fetch full user data including relations
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      subscriptions: {
        where: { isActive: true, expiresAt: { gte: new Date() } }
      },
      following: {
        include: { following: true },
        orderBy: { createdAt: 'desc' }
      },
      likes: {
        include: { media: { include: { author: true } } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!user) redirect("/explore");

  const hasPremium = user.subscriptions.length > 0;

  return (
    <div style={{ padding: "6rem 2rem", maxWidth: "1200px", margin: "0 auto", color: "white" }}>
      
      {/* Profile Header with Icon/Avatar */}
      <div style={{ display: "flex", gap: "3rem", alignItems: "center", marginBottom: "4rem", background: "rgba(255,255,255,0.05)", padding: "3rem", borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.1)" }}>
        {session.user.image ? (
          <img 
            src={session.user.image} 
            alt="Profile Avatar" 
            style={{ width: "120px", height: "120px", borderRadius: "50%", border: "4px solid var(--primary)" }} 
          />
        ) : (
          <div style={{ width: "120px", height: "120px", borderRadius: "50%", background: "linear-gradient(45deg, #ff007a, #7928ca)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UserIcon size={64} color="white" />
          </div>
        )}
        
        <div>
          <h1 style={{ fontSize: "2.5rem", margin: "0 0 0.5rem" }}>{user.name || user.email?.split("@")[0] || "User"}</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", margin: "0 0 1rem", fontSize: "1.1rem" }}>{user.email || "No Email"}</p>
          
          <div style={{ display: "flex", gap: "1rem" }}>
            <span style={{ background: "rgba(255,255,255,0.1)", padding: "0.25rem 0.75rem", borderRadius: "1rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
               {user.role}
            </span>
            {!hasPremium && (
              <Link href="/subscription" style={{ textDecoration: "none" }}>
                <span style={{ background: "var(--primary)", color: "white", padding: "0.25rem 0.75rem", borderRadius: "1rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "bold", cursor: "pointer" }}>
                   <Star size={14} fill="white" /> UPGRADE TO PREMIUM
                </span>
              </Link>
            )}
            {hasPremium && (
              <span style={{ background: "rgba(34, 197, 94, 0.2)", color: "#4ade80", border: "1px solid #22c55e", padding: "0.25rem 0.75rem", borderRadius: "1rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                 <CheckCircle size={14} /> PREMIUM TIER
              </span>
            )}
             {user.address && (
              <span style={{ background: "rgba(255,255,255,0.1)", padding: "0.25rem 0.75rem", borderRadius: "1rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                 Wallet Active
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem" }}>
        {/* Liked Media */}
        <section>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}><Heart color="var(--primary)" /> Liked Tracks</h2>
          {user.likes.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {user.likes.map(like => (
                <Link href={`/media/${like.media.id}`} key={like.id} style={{ textDecoration: "none", color: "inherit" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "rgba(255,255,255,0.05)", padding: "1rem", borderRadius: "0.75rem", transition: "0.2s" }} className="hover-card">
                      <div style={{ width: 50, height: 50, background: "rgba(255,255,255,0.1)", borderRadius: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {like.media.thumbnailUrl ? <img src={like.media.thumbnailUrl} alt={like.media.title} style={{width: '100%', height:'100%', objectFit: 'cover'}} /> : <PlayCircle opacity={0.5} />}
                      </div>
                      <div>
                        <h4 style={{ margin: "0 0 0.25rem" }}>{like.media.title}</h4>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>By {like.media.author?.name || "Unknown Artist"}</p>
                      </div>
                   </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", padding: "3rem", textAlign: "center", borderRadius: "1rem", color: "rgba(255,255,255,0.5)" }}>
               No liked tracks yet. Go explore!
            </div>
          )}
        </section>

        {/* Followed Artists */}
        <section>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}><Star color="#eab308" /> Following Artists</h2>
          {user.following.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {user.following.map(follow => (
                <Link href={`/artist/${follow.followingId}`} key={follow.id} style={{ textDecoration: "none", color: "inherit" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "rgba(255,255,255,0.05)", padding: "1rem", borderRadius: "0.75rem", transition: "0.2s" }} className="hover-card">
                      <div style={{ width: 50, height: 50, background: "linear-gradient(45deg, #ff007a, #7928ca)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontWeight: "bold" }}>
                        {follow.following.name?.[0] || follow.following.email?.[0] || "?"}
                      </div>
                      <div>
                        <h4 style={{ margin: "0" }}>{follow.following.name || follow.following.email?.split("@")[0]}</h4>
                      </div>
                   </div>
                </Link>
              ))}
            </div>
          ) : (
             <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", padding: "3rem", textAlign: "center", borderRadius: "1rem", color: "rgba(255,255,255,0.5)" }}>
               You aren't following anyone yet.
            </div>
          )}
        </section>
      </div>

      <style>{`
         .hover-card:hover {
            background: rgba(255,255,255,0.1) !important;
            transform: translateX(5px);
         }
      `}</style>
    </div>
  );
}
