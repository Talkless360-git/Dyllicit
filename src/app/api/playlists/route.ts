import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const playlists = await prisma.playlist.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, playlists });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { title, description, isPublic } = body;

    const playlist = await prisma.playlist.create({
      data: {
        title,
        description,
        isPublic: isPublic ?? true,
        userId: session.user.id
      }
    });

    return NextResponse.json({ success: true, playlist });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
