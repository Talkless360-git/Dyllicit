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

    // 1. Get the actual contract balance from the subscription contract
    const provider = getProvider();
    const contractAddress = ChainStreamSubscription.address;
    const balanceWei = await provider.getBalance(contractAddress);
    
    // 2. Calculate already committed (pending) payouts that haven't been sent yet
    const pendingSettlements = await prisma.artistSettlement.findMany({
      where: { isPaid: false },
      select: { payoutAmount: true }
    });
    
    const committedWei = pendingSettlements.reduce((acc, curr) => {
      return acc + ethers.parseEther(curr.payoutAmount.toFixed(18));
    }, BigInt(0));
    
    // 3. Calculate available pool for NEW streams
    const availableWei = balanceWei > committedWei ? balanceWei - committedWei : BigInt(0);
    const totalPool = parseFloat(ethers.formatEther(availableWei));

    if (availableWei === BigInt(0)) {
      return NextResponse.json({ 
        success: false, 
        error: 'No new funds available in contract. Pending payouts must be executed first or new subscriptions received.' 
      }, { status: 400 });
    }

    // 4. Get all unsettled streams
    const unsettledStreams = await prisma.stream.findMany({
      where: { isSettled: false },
      include: { media: { select: { authorId: true } } }
    });

    if (unsettledStreams.length === 0) {
      return NextResponse.json({ success: true, message: 'No unsettled streams to process' });
    }

    const totalStreams = unsettledStreams.length;

    // 5. Group streams by artist
    const artistStreams: { [key: string]: number } = {};
    unsettledStreams.forEach(stream => {
      const artistId = stream.media.authorId;
      artistStreams[artistId] = (artistStreams[artistId] || 0) + 1;
    });

    // 6. Calculate payouts using BigInt for precision
    const settlements: {
      artistId: string;
      streamsCount: number;
      payoutAmount: number;
    }[] = [];
    for (const [artistId, streams] of Object.entries(artistStreams)) {
      // (streams / totalStreams) * availableWei
      const payoutWei = (BigInt(streams) * availableWei) / BigInt(totalStreams);
      const payoutEth = parseFloat(ethers.formatEther(payoutWei));
      
      if (payoutWei > BigInt(0)) {
        // Update artist's royalty balance (DB tracking)
        await prisma.user.update({
          where: { id: artistId },
          data: {
            royaltyBalance: {
              increment: payoutEth
            }
          }
        });

        settlements.push({
          artistId,
          streamsCount: streams,
          payoutAmount: payoutEth
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