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
    if (!provider) {
      return NextResponse.json({ error: 'Blockchain provider not available. Check RPC configuration.' }, { status: 503 });
    }
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
      include: { media: { select: { authorId: true, tokenId: true } } }
    });

    if (unsettledStreams.length === 0) {
      return NextResponse.json({ success: true, message: 'No unsettled streams to process' });
    }

    const totalStreams = unsettledStreams.length;

    // 5. Group streams by artist and tokenId
    const tokenStreams: { [key: string]: number } = {};
    const streamToArtist: { [key: string]: string } = {};

    unsettledStreams.forEach(stream => {
      const artistId = stream.media.authorId;
      const tokenId = stream.media.tokenId || "default";
      const key = `${artistId}:${tokenId}`;
      tokenStreams[key] = (tokenStreams[key] || 0) + 1;
      streamToArtist[key] = artistId;
    });

    // 6. Calculate payouts using BigInt for precision
    const settlements: {
      artistId: string;
      tokenId: string | null;
      streamsCount: number;
      payoutAmount: number;
    }[] = [];
    for (const [key, streams] of Object.entries(tokenStreams)) {
      const [artistId, tokenId] = key.split(':');
      const actualTokenId = tokenId === "default" ? null : tokenId;
      
      // Get media details to check for fractionalization
      const media = await prisma.media.findFirst({
        where: { tokenId: actualTokenId, authorId: artistId },
        select: { id: true, fractionalRoyalty: true, totalShares: true }
      });

      // (streams / totalStreams) * availableWei
      const payoutWei = (BigInt(streams) * availableWei) / BigInt(totalStreams);
      const totalPayoutEth = parseFloat(ethers.formatEther(payoutWei));
      
      if (payoutWei > BigInt(0) && media) {
        const holderSplitPercent = media.fractionalRoyalty || 0;
        const holderPoolEth = totalPayoutEth * (holderSplitPercent / 100);
        const artistPayoutEth = totalPayoutEth - holderPoolEth;

        // 1. Pay the Artist their share
        await prisma.user.update({
          where: { id: artistId },
          data: {
            royaltyBalance: { increment: artistPayoutEth }
          }
        });

        // 2. Calculate Holders' share based on quantity
        if (holderPoolEth > 0 && media.totalShares > 0) {
          const holders = await prisma.nFT.findMany({
            where: { mediaId: media.id },
            select: { userId: true, quantity: true }
          });

          const perShareEth = holderPoolEth / media.totalShares;
          let totalDistributedToBuyers = 0;

          if (holders.length > 0) {
            for (const holder of holders) {
              // The artist is already handled below, we'll exclude their NFT record from this loop
              // or just handle them separately to ensure unsold shares are accounted for.
              if (holder.userId === artistId) continue;

              const holderShareEth = holder.quantity * perShareEth;
              totalDistributedToBuyers += holderShareEth;

              await prisma.user.update({
                where: { id: holder.userId },
                data: {
                  royaltyBalance: { increment: holderShareEth }
                }
              });
            }
          }

          // Any unsold shares' royalty goes back to the artist
          const unsoldSharesEth = holderPoolEth - totalDistributedToBuyers;
          if (unsoldSharesEth > 0) {
            await prisma.user.update({
              where: { id: artistId },
              data: {
                royaltyBalance: { increment: unsoldSharesEth }
              }
            });
          }
        }

        settlements.push({
          artistId,
          tokenId: actualTokenId,
          streamsCount: streams,
          payoutAmount: totalPayoutEth
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