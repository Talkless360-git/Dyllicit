import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // audio or video
  const authorId = searchParams.get('authorId');

  try {
    const mediaList = await prisma.media.findMany({
      where: {
        ...(type && { type }),
        ...(authorId && { authorId }),
      },
      include: {
        author: {
          select: { name: true, address: true, id: true }
        },
        nfts: {
          where: { userId: session?.user?.id || 'none' }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Security Layer: Redact URLs for gated content if user is not authorized
    const securedMedia = mediaList.map(item => {
      const isAuthorized = 
        item.authorId === session?.user?.id || 
        session?.user?.isSubscribed === true ||
        item.nfts.length > 0;

      return {
        ...item,
        url: isAuthorized ? item.url : null,
      };
    });

    return NextResponse.json(securedMedia);
  } catch (error) {
    console.error('Fetch media error:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { title, description, type, url, thumbnailUrl, genre, isGated, authorId } = data;

    const media = await prisma.media.create({
      data: {
        title,
        description,
        type,
        url,
        thumbnailUrl,
        genre,
        isGated,
        authorId,
      },
    });

    return NextResponse.json(media);
  } catch (error) {
    console.error('Create media error:', error);
    return NextResponse.json({ error: 'Failed to create media' }, { status: 400 });
  }
}
