import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";
import { ethers } from "ethers";
import { getProvider } from "@/lib/blockchain/provider";
import ChainStreamSubscription from "@/lib/blockchain/contracts/ChainStreamSubscription.json";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { txnHash } = await req.json();

    if (!txnHash || typeof txnHash !== 'string') {
      return NextResponse.json({ error: "Transaction hash required" }, { status: 400 });
    }

    // Check if txn already used
    const existing = await prisma.subscription.findFirst({
      where: { txnHash }
    });

    if (existing) {
      return NextResponse.json({ error: "Transaction already processed" }, { status: 400 });
    }

    // ===== ON-CHAIN VERIFICATION =====
    const provider = getProvider();
    
    // 1. Verify transaction exists and succeeded
    const receipt = await (provider as any).getTransactionReceipt(txnHash);
    if (!receipt) {
      return NextResponse.json({ error: "Transaction not found on-chain" }, { status: 400 });
    }
    if (receipt.status !== 1) {
      return NextResponse.json({ error: "Transaction failed on-chain" }, { status: 400 });
    }

    // 2. Verify it was sent to the correct subscription contract
    const contractAddress = ChainStreamSubscription.address;
    if (receipt.to?.toLowerCase() !== contractAddress.toLowerCase()) {
      return NextResponse.json({ error: "Transaction was not sent to the subscription contract" }, { status: 400 });
    }

    // 3. Verify the Subscribed event was emitted for this user
    const iface = new ethers.Interface(ChainStreamSubscription.abi);
    const subscribedEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        return parsed?.name === 'Subscribed';
      } catch {
        return false;
      }
    });

    if (!subscribedEvent) {
      return NextResponse.json({ error: "No subscription event found in transaction" }, { status: 400 });
    }

    // 4. Optionally verify the event was for this user's address
    const userAddress = (session.user as any).address;
    if (userAddress) {
      try {
        const parsed = iface.parseLog({ topics: subscribedEvent.topics, data: subscribedEvent.data });
        const eventUser = parsed?.args?.[0]; // first indexed param = user address
        if (eventUser && eventUser.toLowerCase() !== userAddress.toLowerCase()) {
          return NextResponse.json({ error: "Transaction does not belong to your wallet" }, { status: 400 });
        }
      } catch {
        // If parsing fails, still allow — the event existence check above is the main guard
      }
    }
    // ===== END VERIFICATION =====

    // 5. Get actual expiration date from event or duration setting
    const expireDate = new Date();
    try {
      const contract = new ethers.Contract(contractAddress, ChainStreamSubscription.abi, provider);
      const durationSeconds = await contract.subscriptionDuration();
      expireDate.setSeconds(expireDate.getSeconds() + Number(durationSeconds));
    } catch (e) {
      console.warn("Failed to read on-chain duration, falling back to 30 days:", e);
      expireDate.setDate(expireDate.getDate() + 30);
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        tier: "premium",
        txnHash,
        expiresAt: expireDate,
        isActive: true
      }
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error("Subscription validation failed", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ subscribed: false });
    }

    const sub = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        }
      }
    });

    return NextResponse.json({ subscribed: !!sub, subscription: sub });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
