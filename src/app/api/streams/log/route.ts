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
        isSettled: true, // Mark as settled immediately for this demo
      },
      include: {
        media: {
          include: {
            author: true,
            nfts: {
              where: {
                userId: { not: { equals: "authorPlaceholder" } } // We'll filter in JS
              }
            }
          }
        }
      }
    });

    // --- Royalty Distribution Logic ---
    const settings = await prisma.globalSettings.findUnique({ where: { id: "global" } });
    const pricePerStream = 0.0001; // Target payout per stream in ETH
    const platformFeePercent = settings?.platformFee || 2.5;
    
    const media = stream.media;
    const author = media.author;
    
    // 1. Calculate Platform Cut
    const platformCut = (pricePerStream * platformFeePercent) / 100;
    const remainingRoyalty = pricePerStream - platformCut;

    // 2. Calculate Fractional Split for the remaining amount
    const holdersPercentage = media.fractionalRoyalty || 0;
    const totalHoldersShare = (remainingRoyalty * holdersPercentage) / 100;
    const artistShare = remainingRoyalty - totalHoldersShare;

    // 3. Credit the Admin (Platform Revenue)
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (adminUser) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { royaltyBalance: { increment: platformCut } }
      });
    }

    // 4. Credit the Artist
    await prisma.user.update({
      where: { id: author.id },
      data: { royaltyBalance: { increment: artistShare } }
    });

    // 5. Credit the Fractional Holders
    if (totalHoldersShare > 0 && media.totalShares > 0) {
      const nfts = await prisma.nFT.findMany({
        where: { mediaId: media.id, userId: { not: author.id } }
      });

      for (const nft of nfts) {
        const holderShare = (totalHoldersShare * nft.quantity) / media.totalShares;
        if (holderShare > 0) {
          await prisma.user.update({
            where: { id: nft.userId },
            data: { royaltyBalance: { increment: holderShare } }
          });
        }
      }
    }

    await prisma.media.update({
      where: { id: mediaId },
      data: { playCount: { increment: 1 } }
    });

    return NextResponse.json({ success: true, stream, royaltyEarned: artistShare, platformCut });
  } catch (error) {
    console.error('Error logging stream:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
