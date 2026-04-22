import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { ethers } from 'ethers';
import { getProvider } from '@/lib/blockchain/provider';
import ChainStreamSubscription from '@/lib/blockchain/contracts/ChainStreamSubscription.json';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth/next';

// This route calculates and updates royalty balances based on unsettled streams
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the actual contract balance from the subscription contract
    const provider = getProvider();
    const contractAddress = ChainStreamSubscription.address;
    const balanceWei = await provider.getBalance(contractAddress);
    const totalPool = parseFloat(ethers.formatEther(balanceWei));

    if (totalPool === 0) {
      return NextResponse.json({ success: false, error: 'Subscription pool is empty' }, { status: 400 });
    }

    // Get all unsettled streams
    const unsettledStreams = await prisma.stream.findMany({
      where: { isSettled: false },
      include: { media: { select: { authorId: true } } }
    });

    if (unsettledStreams.length === 0) {
      return NextResponse.json({ success: true, message: 'No unsettled streams to process' });
    }

    const totalStreams = unsettledStreams.length;

    // Group streams by artist
    const artistStreams: { [key: string]: number } = {};
    unsettledStreams.forEach(stream => {
      const artistId = stream.media.authorId;
      artistStreams[artistId] = (artistStreams[artistId] || 0) + 1;
    });

    // Calculate payouts and update balances
    const settlements: any[] = [];
    for (const [artistId, streams] of Object.entries(artistStreams)) {
      const payout = (streams / totalStreams) * totalPool;
      if (payout > 0) {
        // Update artist's royalty balance
        await prisma.user.update({
          where: { id: artistId },
          data: {
            royaltyBalance: {
              increment: payout
            }
          }
        });

        settlements.push({
          artistId,
          streamsCount: streams,
          payoutAmount: payout
        });
      }
    }

    // Create settlement record
    const settlement = await prisma.royaltySettlement.create({
      data: {
        totalPool,
        totalStreams,
        settlements: {
          create: settlements
        }
      }
    });

    // Mark streams as settled
    await prisma.stream.updateMany({
      where: { isSettled: false },
      data: { isSettled: true }
    });

    return NextResponse.json({
      success: true,
      settlement: {
        id: settlement.id,
        totalPool,
        totalStreams,
        artistSettlements: settlements.length
      }
    });
  } catch (error) {
    console.error('Settlement Error:', error);
    return NextResponse.json({ error: 'Failed to settle royalties' }, { status: 500 });
  }
}