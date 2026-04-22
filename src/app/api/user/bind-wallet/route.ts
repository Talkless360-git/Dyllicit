import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";
import { verifyMessage } from "ethers";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      console.log("Bind-wallet: Unauthorized access attempt or missing ID", session?.user);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { address, signature, message } = await req.json();
    
    if (!address || !signature || !message) {
      return NextResponse.json({ error: "Address, signature, and message are required" }, { status: 400 });
    }

    // Security check: Verify the signature
    try {
      const recoveredAddress = verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
      }
    } catch (e) {
      return NextResponse.json({ error: "Invalid signature format" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    console.log(`Binding wallet ${normalizedAddress} to user ${session.user.id}`);

    // Check if wallet is already attached to someone else
    const existing = await prisma.user.findUnique({
      where: { address: normalizedAddress }
    });

    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: "Wallet already in use by another account." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { address: normalizedAddress },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Failed to bind wallet:", error);
    return NextResponse.json({ 
      error: "Internal Error", 
      details: error.message,
      code: error.code 
    }, { status: 500 });
  }
}
