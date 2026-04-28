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

    // 6. Calculate total platform earnings based on on-chain settings
    const contract = new ethers.Contract(contractAddress, ChainStreamSubscription.abi, provider);
    let platformEarningsEth = "0.0";
    let platformFeePercent = "2.5";
    try {
      const priceWei = await contract.subscriptionPrice();
      const feeBps = await contract.platformFeeBps();
      const totalSubscriptions = await prisma.subscription.count();
      
      const priceEth = parseFloat(ethers.formatEther(priceWei));
      platformFeePercent = (Number(feeBps) / 100).toFixed(1);
      const feeMultiplier = Number(feeBps) / 10000;
      
      platformEarningsEth = (totalSubscriptions * priceEth * feeMultiplier).toFixed(5);
    } catch (e) {
      console.warn("Failed to calculate platform earnings from on-chain data:", e);
      // Fallback to basic count if contract read fails
      const totalSubscriptions = await prisma.subscription.count();
      platformEarningsEth = (totalSubscriptions * 0.01 * 0.025).toFixed(5);
    }

    return NextResponse.json({
      success: true,
      stats: {
        contractBalance: balanceEth,
        platformEarnings: platformEarningsEth,
        platformFeePercent,
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
