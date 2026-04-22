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

    const { mediaId } = await req.json();

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_mediaId: {
          userId: session.user.id,
          mediaId: mediaId,
        }
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id }
      });
      return NextResponse.json({ success: true, liked: false });
    } else {
      await prisma.like.create({
        data: {
          userId: session.user.id,
          mediaId: mediaId,
        }
      });
      return NextResponse.json({ success: true, liked: true });
    }

  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
