import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth/next';

// Minimum payout threshold
const MIN_PAYOUT = 0.005; // ETH

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const artistId = session.user.id;

    // Get artist's current balance
    const artist = await prisma.user.findUnique({
      where: { id: artistId },
      select: { royaltyBalance: true, payoutAddress: true, totalPaidOut: true }
    });

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    if (!artist.payoutAddress) {
      return NextResponse.json({ error: 'Payout address not set' }, { status: 400 });
    }

    if (artist.royaltyBalance < MIN_PAYOUT) {
      return NextResponse.json({
        error: `Insufficient balance. Minimum payout is ${MIN_PAYOUT} ETH`
      }, { status: 400 });
    }

    // In our new batch payout system, the admin triggers the actual on-chain transaction.
    // The artist's royaltyBalance in the database represents their "Accrued" amount
    // which has been settled but not yet paid on-chain.
    
    // We already have their balance tracked. This endpoint could eventually
    // serve as a "nudge" or "request" signal to the admin.
    
    return NextResponse.json({
      success: true,
      payoutAmount: artist.royaltyBalance,
      message: 'Your royalties are accrued and waiting for the next monthly batch distribution.'
    });
  } catch (error) {
    console.error('Payout Error:', error);
    return NextResponse.json({ error: 'Failed to process payout' }, { status: 500 });
  }
}