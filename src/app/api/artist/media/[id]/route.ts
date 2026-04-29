import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/db/prisma';
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const media = await prisma.media.findUnique({ where: { id: params.id } });
    if (!media) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    if (media.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete Media
    // Note: Due to relation constraints, we delete NFTs associated with this media first
    await prisma.nFT.deleteMany({ where: { mediaId: params.id } });

    await prisma.media.delete({ where: { id: params.id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Media error", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
