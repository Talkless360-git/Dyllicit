import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { name: true, address: true } },
        items: {
          include: {
            media: {
              include: { 
                author: { select: { name: true, address: true } },
                nfts: {
                  where: { userId: session?.user?.id || 'none' }
                }
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    
    // Check if private and not the owner
    if (!playlist.isPublic && (!session || session.user.id !== playlist.userId)) {
      return NextResponse.json({ error: "Private playlist" }, { status: 403 });
    }

    // Secure/Redact Gated Media URLs in Playlist items
    const securedItems = playlist.items.map(item => {
      const isOwned = item.media.nfts.length > 0;
      const isAuthor = session?.user?.id === item.media.authorId;
      const isSubscriber = session?.user?.isSubscribed === true;
      const isAuthorized = !item.media.isGated || isAuthor || isSubscriber || isOwned;

      return {
        ...item,
        media: {
          ...item.media,
          url: isAuthorized ? item.media.url : null
        }
      };
    });

    const securedPlaylist = {
      ...playlist,
      items: securedItems
    };

    return NextResponse.json({ success: true, playlist: securedPlaylist });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { mediaId, action } = body; // action: 'add' or 'remove'

    const playlist = await prisma.playlist.findUnique({
      where: { id: params.id }
    });

    if (!playlist || playlist.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden or not found" }, { status: 403 });
    }

    if (action === 'add') {
      const itemCount = await prisma.playlistItem.count({ where: { playlistId: params.id } });
      await prisma.playlistItem.create({
        data: {
          playlistId: params.id,
          mediaId: mediaId,
          order: itemCount
        }
      });
    } else if (action === 'remove') {
      await prisma.playlistItem.deleteMany({
        where: {
          playlistId: params.id,
          mediaId: mediaId
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.playlist.delete({
      where: { 
        id: params.id,
        userId: session.user.id
      }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
