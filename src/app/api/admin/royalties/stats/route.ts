import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { ethers } from 'ethers';
import { getProvider } from '@/lib/blockchain/provider';
import ChainStreamSubscription from '@/lib/blockchain/contracts/ChainStreamSubscription.json';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth/next';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    // 6. Calculate total platform earnings (2.5% of 0.01 ETH per subscription)
    const totalSubscriptions = await prisma.subscription.count();
    const platformEarningsEth = (totalSubscriptions * 0.01 * 0.025).toFixed(5);

    return NextResponse.json({
      success: true,
      stats: {
        contractBalance: balanceEth,
        platformEarnings: platformEarningsEth,
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
