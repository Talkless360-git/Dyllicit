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

    const { mediaId, content } = await req.json();

    const comment = await prisma.comment.create({
      data: {
        userId: session.user.id,
        mediaId: mediaId,
        content: content,
      },
      include: {
        user: { select: { name: true, image: true, email: true, address: true } }
      }
    });

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get('mediaId');

    if (!mediaId) return NextResponse.json({ error: "Missing mediaId" }, { status: 400 });

    const comments = await prisma.comment.findMany({
      where: { mediaId },
      include: {
        user: { select: { name: true, image: true, address: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ comments });
  } catch(error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
