import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Fetch Owned Media (via NFTs)
    const ownedNFTs = await prisma.nFT.findMany({
      where: { userId },
      include: { 
        media: {
          include: {
            author: { select: { name: true, address: true } }
          }
        } 
      }
    });
    const ownedMedia = ownedNFTs.map(nft => nft.media);

    // 2. Fetch Liked Media
    const likedSongs = await prisma.like.findMany({
      where: { userId },
      include: { 
        media: {
          include: {
            author: { select: { name: true, address: true } }
          }
        } 
      },
      orderBy: { createdAt: 'desc' }
    });
    const likedMedia = likedSongs.map(l => l.media);

    // 3. Fetch Recently Played (Last 20 unique items)
    const recentStreams = await prisma.stream.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50, // Get more to handle uniqueness
      include: { 
        media: {
          include: {
            author: { select: { name: true, address: true } }
          }
        } 
      }
    });
    
    // Filter for unique media items
    const seenMediaIds = new Set();
    const uniqueRecentMedia = recentStreams
      .map(s => s.media)
      .filter(media => {
        if (seenMediaIds.has(media.id)) return false;
        seenMediaIds.add(media.id);
        return true;
      })
      .slice(0, 20);

    return NextResponse.json({
      owned: ownedMedia,
      likes: likedMedia,
      recent: uniqueRecentMedia
    });
  } catch (error: any) {
    console.error("Library fetch error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
