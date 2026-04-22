import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { ethers } from 'ethers';

// This route returns all unpaid settlements grouped by artist for batch payout
export async function GET() {
  try {
    // Current logic: Find all settlements that haven't been 'paid' yet
    // Since we don't have a 'isPaid' flag on ArtistSettlement yet, let's check the schema again
    // We might need to add a flag or check if a transaction exists
    
    // For now, let's look for settlements that don't have a transaction hash recorded
    // Wait, the schema doesn't have a txnHash on ArtistSettlement either.
    // Let's check the schema again.
    
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
      return NextResponse.json({ success: true, message: 'No pending payouts', artists: [], amounts: [] });
    }

    // Group and prepare for contract call
    const batch = pendingSettlements.reduce((acc: any, curr) => {
      const address = curr.artist.payoutAddress || curr.artist.address;
      if (!address) return acc;
      
      if (!acc[address]) {
        acc[address] = BigInt(0);
      }
      // Convert payoutAmount (ETH) to Wei
      const amountWei = ethers.parseEther(curr.payoutAmount.toString());
      acc[address] += amountWei;
      return acc;
    }, {});

    const artists = Object.keys(batch);
    const amounts = Object.values(batch).map(v => v.toString());

    return NextResponse.json({
      success: true,
      artists,
      amounts,
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
    const { txHash, settlementIds } = await req.json();

    if (!txHash || !settlementIds || !Array.isArray(settlementIds)) {
      return NextResponse.json({ error: 'Missing transaction hash or settlement IDs' }, { status: 400 });
    }

    // 1. Mark settlements as paid
    await prisma.artistSettlement.updateMany({
      where: {
        id: { in: settlementIds }
      },
      data: {
        isPaid: true
      }
    });

    // 2. We should also record the transaction
    // For simplicity in this demo, we'll assume the admin is one user
    // In a real app, you'd link this to the actual admin's user record
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (admin) {
      await prisma.transaction.create({
        data: {
          hash: txHash,
          type: 'royalty',
          amount: 0, // Total amount could be calculated if needed
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
