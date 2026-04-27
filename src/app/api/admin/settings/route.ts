import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let settings = await prisma.globalSettings.findUnique({ where: { id: "global" }});
    if (!settings) {
      settings = await prisma.globalSettings.create({ data: { id: "global" }});
    }
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("DB Error fetching settings:", error);
    return NextResponse.json({ 
      settings: { platformFee: 2.5, defaultRoyalty: 5.0, subscriptionFee: 0.01 },
      dbError: true 
    });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { platformFee, defaultRoyalty, subscriptionFee } = body;

  try {
    const settings = await prisma.globalSettings.upsert({
      where: { id: "global" },
      update: { platformFee, defaultRoyalty, subscriptionFee },
      create: { id: "global", platformFee, defaultRoyalty, subscriptionFee }
    });
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("DB Error saving settings:", error);
    return NextResponse.json({ error: "Failed to save settings to database. It may be unreachable." }, { status: 500 });
  }
}
