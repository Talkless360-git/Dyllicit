import { NextResponse } from 'next/server';
import prisma from "@/lib/db/prisma";

export async function GET() {
  try {
    let settings = await prisma.globalSettings.findUnique({ where: { id: "global" }});
    if (!settings) {
      settings = await prisma.globalSettings.create({ 
        data: { 
          id: "global",
          platformFee: 2.5,
          defaultRoyalty: 5.0,
          subscriptionFee: 0.01
        }
      });
    }
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
