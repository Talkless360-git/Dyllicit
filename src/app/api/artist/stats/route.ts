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
        _count: { select: { streams: true } },
        nfts: {
          where: {
            userId: { not: artistId }
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                address: true
              }
            }
          }
        }
      }
    });

    let totalStreams = 0;
    let totalSharesSold = 0;
    let totalSalesRevenue = 0;

    const mediaWithSales = artistMedia.map(m => {
      totalStreams += m._count.streams;
      
      const sharesSold = m.nfts.reduce((acc, nft) => acc + nft.quantity, 0);
      const sharesLeft = m.totalShares - sharesSold;
      const price = m.price || 0;
      const salesRevenue = sharesSold * price * 0.97; // 97% goes to artist
      const supplySoldPercentage = m.totalShares > 0 ? (sharesSold / m.totalShares) * 100 : 0;
      
      const collectors = m.nfts.map(nft => ({
        id: nft.user.id,
        name: nft.user.name,
        image: nft.user.image,
        address: nft.user.address,
        quantity: nft.quantity,
        purchasedAt: nft.createdAt
      }));
      
      totalSharesSold += sharesSold;
      totalSalesRevenue += salesRevenue;

      return {
        ...m,
        sharesSold,
        sharesLeft,
        salesRevenue,
        supplySoldPercentage,
        collectors
      };
    });

    const totalMedia = artistMedia.length;

    const artist = await prisma.user.findUnique({
      where: { id: artistId },
      select: { royaltyBalance: true, payoutAddress: true, address: true }
    });

    // Get recent stream logs for these media items
    const recentStreams = await prisma.stream.findMany({
      where: { media: { authorId: artistId } },
      take: 20,
      orderBy: { timestamp: 'desc' },
      include: { media: true }
    });

    const payload = {
      success: true,
      stats: {
        totalStreams,
        totalMedia,
        royaltyBalance: artist?.royaltyBalance || 0,
        payoutAddress: artist?.payoutAddress || artist?.address,
        mediaDetail: mediaWithSales,
        recentStreams,
        totalSharesSold,
        totalSalesRevenue
      }
    };
    
    console.log("API STATS RESPONSE:", {
       royaltyBalance: payload.stats.royaltyBalance,
       payoutAddress: payload.stats.payoutAddress
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Artist Stats Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
