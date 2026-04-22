import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { ethers } from 'ethers';
import { getProvider } from '@/lib/blockchain/provider';
import ChainStreamSubscription from '@/lib/blockchain/contracts/ChainStreamSubscription.json';

export async function GET() {
  try {
    const provider = getProvider();
    const contractAddress = ChainStreamSubscription.address;
    
    // 1. Get contract balance
    let balanceEth = "0.0";
    try {
      const balanceWei = await provider.getBalance(contractAddress);
      balanceEth = ethers.formatEther(balanceWei);
    } catch (e) {
      console.warn("Failed to fetch contract balance:", e);
    }

    // 2. Get last settlement date
    const lastSettlement = await prisma.royaltySettlement.findFirst({
      orderBy: { processedAt: 'desc' },
      include: { settlements: true }
    });

    // 3. Get total pending (unpaid) settlements
    const pendingSettlementsCount = await prisma.artistSettlement.count({
      where: { isPaid: false }
    });

    // 4. Get recent settlement history
    const history = await prisma.royaltySettlement.findMany({
      take: 5,
      orderBy: { processedAt: 'desc' },
      include: { _count: { select: { settlements: true } } }
    });

    // 5. Check if notification is needed (more than 30 days since last settlement)
    const isDue = lastSettlement 
      ? (new Date().getTime() - new Date(lastSettlement.processedAt).getTime()) > 30 * 24 * 60 * 60 * 1000
      : true;

    return NextResponse.json({
      success: true,
      stats: {
        contractBalance: balanceEth,
        lastSettlementDate: lastSettlement?.processedAt,
        pendingSettlementsCount,
        isDue,
        history
      }
    });
  } catch (error) {
    console.error('Royalty Stats Error:', error);
    return NextResponse.json({ error: 'Failed to fetch royalty stats' }, { status: 500 });
  }
}
