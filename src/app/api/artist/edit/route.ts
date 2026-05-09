import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ARTIST') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { mediaId, newTokenId, newMetadataUrl, newThumbnailUrl, title, description, url, genre } = body;

    const media = await prisma.media.findUnique({
      where: { id: mediaId }
    });

    if (!media || media.authorId !== session.user.id) {
      return NextResponse.json({ error: "Media not found or not owner" }, { status: 403 });
    }

    // Update the existing Media record with the new NFT information and metadata
    // All Stream and Playlist associations remain intact because they use the same mediaId
    const updatedMedia = await prisma.media.update({
      where: { id: mediaId },
      data: {
        title: title || media.title,
        description: description || media.description,
        genre: genre || media.genre,
        url: url || media.url,
        thumbnailUrl: newThumbnailUrl || media.thumbnailUrl,
        tokenId: newTokenId,
        metadataUrl: newMetadataUrl || media.metadataUrl,
      }
    });

    return NextResponse.json({ success: true, media: updatedMedia });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
