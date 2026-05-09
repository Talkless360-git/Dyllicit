import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { ethers } from 'ethers';
import { getProvider } from '@/lib/blockchain/provider';
import ChainStreamSubscription from '@/lib/blockchain/contracts/ChainStreamSubscription.json';
import ChainStreamNFT from '@/lib/blockchain/contracts/ChainStreamNFT.json';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth/next';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use a wrapper to add timeout to Prisma calls
    const withTimeout = async (promise: Promise<any>, timeoutMs = 4000, label = "Operation") => {
      let timeoutId: any;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} Timeout`)), timeoutMs);
      });
      
      try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
    };

    // 1. Initialize Provider
    let provider = null;
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://carrot.megaeth.com/rpc";
      provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
    } catch (e) {
      console.error("Failed to init provider in API:", e);
    }

    const contractAddress = ChainStreamSubscription.address;
    
    // 2. Get contract balance
    let balanceEth = "0.0";
    if (provider) {
      try {
        const balanceWei = await withTimeout(provider.getBalance(contractAddress), 3000, "Balance Fetch") as bigint;
        balanceEth = ethers.formatEther(balanceWei);
      } catch (e) {
        console.warn("Failed to fetch contract balance:", e);
      }
    }

    // 3. Get last settlement date
    let lastSettlement = null;
    try {
      lastSettlement = await withTimeout(prisma.royaltySettlement.findFirst({
        orderBy: { processedAt: 'desc' },
        include: { settlements: true }
      }), 4000, "DB LastSettlement");
    } catch (e) {
      console.error("Last settlement fetch failed:", e);
    }

    // 4. Get total pending (unpaid) settlements
    let pendingSettlementsCount = 0;
    try {
      pendingSettlementsCount = await withTimeout(prisma.artistSettlement.count({
        where: { isPaid: false }
      }), 4000, "DB PendingCount");
    } catch (e) {
      console.error("Pending count failed:", e);
    }

    // 5. Get recent settlement history
    let history: any[] = [];
    try {
      history = await withTimeout(prisma.royaltySettlement.findMany({
        take: 5,
        orderBy: { processedAt: 'desc' },
        include: { _count: { select: { settlements: true } } }
      }), 4000, "DB History");
    } catch (e) {
      console.error("History fetch failed:", e);
    }

    // 6. Get Contract Owner & Platform Revenue Details
    let contractOwner = "0x047DF2c5Dd11BC7579E53800B1b6E54c6414826f";
    let platformRevenueBreakdown: any[] = [];
    let totalPlatformEarned = 0n;
    let nftContractBalanceEth = "0.0";

    if (provider) {
      try {
        const subscriptionContract = new ethers.Contract(
          contractAddress,
          ChainStreamSubscription.abi,
          provider
        );
        const onChainOwner = await withTimeout(subscriptionContract.owner(), 3000, "Contract Owner Fetch");
        if (onChainOwner) contractOwner = onChainOwner;

        // Fetch NFT Contract Balance (Platform Profits)
        const nftContractAddress = ChainStreamNFT.address;
        const nftBalanceWei = await withTimeout(provider.getBalance(nftContractAddress), 3000, "NFT Balance Fetch") as bigint;
        nftContractBalanceEth = ethers.formatEther(nftBalanceWei);

        // Fetch recent logs for PlatformFeeCollected events from NFT Contract
        const nftContract = new ethers.Contract(nftContractAddress, ChainStreamNFT.abi, provider);
        const filter = nftContract.filters.PlatformFeeCollected();
        const logs = await withTimeout(provider.getLogs({
          ...filter,
          fromBlock: "earliest" // For testnet we can usually scan from earliest
        }), 5000, "Event Logs Fetch");

        platformRevenueBreakdown = logs.map((log: any) => {
          const parsed = nftContract.interface.parseLog(log);
          const amount = parsed?.args[1];
          totalPlatformEarned += amount;
          return {
            from: parsed?.args[0],
            amount: ethers.formatEther(amount),
            type: parsed?.args[2], // "MINT" or "SALE"
            transactionHash: log.transactionHash
          };
        }).reverse().slice(0, 20); // Show last 20

      } catch (e) {
        console.warn("Failed to fetch contract details/logs:", e);
      }
    }

    // 7. Calculate platform share and royalty pool
    let settings = { platformFee: 2.5, subscriptionFee: 0.01 };
    try {
      const dbSettings = await withTimeout(prisma.globalSettings.findUnique({
        where: { id: "global" }
      }), 2000, "DB Settings");
      if (dbSettings) settings = dbSettings as any;
    } catch (e) {
      console.error("Global settings fetch failed:", e);
    }
    
    const platformFeePercent = settings.platformFee.toFixed(1);

    return NextResponse.json({
      success: true,
      stats: {
        royaltyPoolBalance: balanceEth, // Balance of Subscription Contract
        platformProfits: nftContractBalanceEth, // Balance of NFT Contract
        platformEarnings: ethers.formatEther(totalPlatformEarned),
        platformFeePercent,
        lastSettlementDate: lastSettlement?.processedAt,
        pendingSettlementsCount,
        contractOwner,
        platformRevenueBreakdown,
        isDue: lastSettlement 
          ? (new Date().getTime() - new Date(lastSettlement.processedAt).getTime()) > 30 * 24 * 60 * 60 * 1000
          : true,
        history
      }
    });
  } catch (error) {
    console.error('Royalty Stats Critical Error:', error);
    return NextResponse.json({ error: 'Failed to fetch royalty stats' }, { status: 500 });
  }
}
