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

    const { mediaId, duration = 0 } = await req.json();

    if (!mediaId) {
      return NextResponse.json({ error: "Media ID is required" }, { status: 400 });
    }

    // Check if the user is the author
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      select: { authorId: true }
    });

    if (media && media.authorId === session.user.id) {
      return NextResponse.json({ success: true, message: "Self-play not recorded for royalties" });
    }

    // Record the stream event
    const stream = await prisma.stream.create({
      data: {
        userId: session.user.id,
        mediaId: mediaId,
        duration: duration,
      }
    });

    // Increment media play count
    await prisma.media.update({
      where: { id: mediaId },
      data: { playCount: { increment: 1 } }
    });

    return NextResponse.json({ success: true, stream });
  } catch (error: any) {
    console.error("Stream tracking error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
