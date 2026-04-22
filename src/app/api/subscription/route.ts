import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { txnHash } = await req.json();

    if (!txnHash) {
      return NextResponse.json({ error: "Transaction hash required" }, { status: 400 });
    }

    // Check if txn already used
    const existing = await prisma.subscription.findFirst({
      where: { txnHash }
    });

    if (existing) {
      return NextResponse.json({ error: "Transaction already processed" }, { status: 400 });
    }

    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 30); // 30 days

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
