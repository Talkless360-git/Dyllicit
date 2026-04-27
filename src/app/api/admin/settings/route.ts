import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let settings = await prisma.globalSettings.findUnique({ where: { id: "global" }});
  if (!settings) {
    settings = await prisma.globalSettings.create({ data: { id: "global" }});
  }

  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { platformFee, defaultRoyalty, subscriptionFee } = body;

  const settings = await prisma.globalSettings.upsert({
    where: { id: "global" },
    update: { platformFee, defaultRoyalty, subscriptionFee },
    create: { id: "global", platformFee, defaultRoyalty, subscriptionFee }
  });

  return NextResponse.json({ success: true, settings });
}
