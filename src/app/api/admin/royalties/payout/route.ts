import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { ethers } from 'ethers';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth/next';

// This route returns all unpaid settlements grouped by artist for batch payout
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pendingSettlements = await prisma.artistSettlement.findMany({
      where: {
        isPaid: false
      },
      include: {
        artist: {
          select: { address: true, payoutAddress: true, name: true }
        }
      }
    });

    if (pendingSettlements.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending payouts', artists: [], amounts: [], tokenIds: [] });
    }

    // Prepare parallel arrays for the contract
    const artists: string[] = [];
    const amounts: string[] = [];
    const tokenIds: string[] = [];
    const settlementIds: string[] = [];

    pendingSettlements.forEach(curr => {
      const address = curr.artist.payoutAddress || curr.artist.address;
      if (!address) return;

      artists.push(address);
      amounts.push(ethers.parseEther(curr.payoutAmount.toString()).toString());
      tokenIds.push(curr.tokenId || "0"); // 0 for default
      settlementIds.push(curr.id);
    });

    return NextResponse.json({
      success: true,
      artists,
      amounts,
      tokenIds,
      settlementIds,
      count: artists.length,
      rawSettlements: pendingSettlements
    });
  } catch (error) {
    console.error('Payout Data Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payout data' }, { status: 500 });
  }
}

// POST endpoint to mark settlements as paid after on-chain TX success
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { txHash, settlementIds } = await req.json();

    if (!txHash || !settlementIds || !Array.isArray(settlementIds)) {
      return NextResponse.json({ error: 'Missing transaction hash or settlement IDs' }, { status: 400 });
    }

    // --- SECURITY FIX: Verify transaction on-chain ---
    const { verifyTransaction } = await import('@/lib/blockchain/verify');
    // We expect the transaction to come from the admin wallet
    const adminWallet = process.env.ADMIN_WALLET_ADDRESS;
    const verification = await verifyTransaction(txHash, adminWallet);

    if (!verification.success) {
      return NextResponse.json({ 
        error: 'Blockchain transaction verification failed. The transaction may not exist, failed, or was sent from an unauthorized address.',
        details: verification.receipt ? 'Transaction status: failed' : 'Transaction not found'
      }, { status: 400 });
    }
    // ------------------------------------------------

    // 1. Fetch settlements to know how much to decrement
    const settlementsToPay = await prisma.artistSettlement.findMany({
      where: { id: { in: settlementIds } }
    });

    // 2. Decrement artist balances and mark as paid
    await prisma.$transaction(async (tx) => {
      // Mark as paid
      await tx.artistSettlement.updateMany({
        where: { id: { in: settlementIds } },
        data: { isPaid: true }
      });

      // Decrement balances
      for (const settlement of settlementsToPay) {
        await tx.user.update({
          where: { id: settlement.artistId },
          data: {
            royaltyBalance: { decrement: settlement.payoutAmount },
            totalPaidOut: { increment: settlement.payoutAmount }
          }
        });
      }
    });

    // 2. Record the transaction
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (admin) {
      await prisma.transaction.create({
        data: {
          hash: txHash,
          type: 'royalty',
          amount: 0, 
          userId: admin.id
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Payouts recorded successfully' });
  } catch (error) {
    console.error('Record Payout Error:', error);
    return NextResponse.json({ error: 'Failed to record payout' }, { status: 500 });
  }
}
