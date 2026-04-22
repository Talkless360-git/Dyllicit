import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import FollowButton from "@/components/artist/FollowButton";

export default async function ArtistProfilePage({ params }: { params: { id: string } }) {
  const artist = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      media: true,
      _count: {
        select: { followers: true }
      }
    }
  });

  if (!artist || artist.role !== "ARTIST") return notFound();

  return (
    <div style={{ padding: "6rem 2rem", maxWidth: "1200px", margin: "0 auto", color: "white" }}>
      <div style={{ display: "flex", gap: "3rem", alignItems: "center", marginBottom: "4rem" }}>
        <div style={{ width: 150, height: 150, borderRadius: "50%", background: "linear-gradient(45deg, #ff007a, #7928ca)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem", fontWeight: "bold" }}>
          {artist.name?.[0] || artist.email?.[0]?.toUpperCase() || "A"}
        </div>
        <div>
          <h1 style={{ fontSize: "3rem", margin: "0 0 0.5rem" }}>{artist.name || artist.email?.split("@")[0] || "Unknown Artist"}</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", margin: "0 0 1rem" }}>{artist._count.followers} Followers</p>
          <FollowButton artistId={artist.id} initialFollowers={artist._count.followers} />
        </div>
      </div>

      <h2>Latest Releases</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "2rem", marginTop: "2rem" }}>
        {artist.media.map(m => (
          <Link href={`/explore`} key={m.id} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "1rem", overflow: "hidden", transition: "0.3s" }}>
              <div style={{ height: "200px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                 <PlayCircle size={48} opacity={0.5} />
              </div>
              <div style={{ padding: "1.5rem" }}>
                <h3 style={{ margin: "0 0 0.5rem" }}>{m.title}</h3>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>{m.type.toUpperCase()}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
