import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth/next';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const artistId = session.user.id;

    // 2. Aggregate stats for media owned by this artist
    const artistMedia = await prisma.media.findMany({
      where: { authorId: artistId },
      include: {
        _count: { select: { streams: true } }
      }
    });

    const totalStreams = artistMedia.reduce((acc, m) => acc + m._count.streams, 0);
    const totalMedia = artistMedia.length;

    // Get artist's royalty balance
    const artist = await prisma.user.findUnique({
      where: { id: artistId },
      select: { royaltyBalance: true, payoutAddress: true }
    });

    // Get recent stream logs for these media items
    const recentStreams = await prisma.stream.findMany({
      where: { media: { authorId: artistId } },
      take: 20,
      orderBy: { timestamp: 'desc' },
      include: { media: true }
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalStreams,
        totalMedia,
        royaltyBalance: artist?.royaltyBalance || 0,
        payoutAddress: artist?.payoutAddress,
        mediaDetail: artistMedia,
        recentStreams
      }
    });
  } catch (error) {
    console.error('Artist Stats Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
