import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const { mediaId, userId, duration } = await req.json();

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const stream = await prisma.stream.create({
      data: {
        mediaId,
        userId: userId || null,
        duration: duration || 0,
      },
    });

    await prisma.media.update({
      where: { id: mediaId },
      data: { playCount: { increment: 1 } }
    });

    return NextResponse.json({ success: true, stream });
  } catch (error) {
    console.error('Error logging stream:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
