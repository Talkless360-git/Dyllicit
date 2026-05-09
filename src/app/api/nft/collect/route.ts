import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { tokenId, ownerAddress } = data;

    if (!tokenId || !ownerAddress) {
      return NextResponse.json({ error: 'Missing tokenId or ownerAddress' }, { status: 400 });
    }

    const normalizedAddress = ownerAddress.toLowerCase();
    console.log(`[Collect] Syncing collection for ${normalizedAddress}, TokenID: ${tokenId}`);

    // 1. Find the Media associated with this tokenId
    const media = await prisma.media.findUnique({
      where: { tokenId: String(tokenId) }
    });

    if (!media) {
      console.error(`[Collect] Media not found for TokenID: ${tokenId}`);
      return NextResponse.json({ error: 'Media not found for this tokenId' }, { status: 404 });
    }

    // 2. Ensure user exists
    const user = await prisma.user.upsert({
      where: { address: normalizedAddress },
      update: {},
      create: {
        address: normalizedAddress,
        role: 'USER'
      }
    });

    // 3. Create the NFT ownership record and decrement author's quantity
    const ownership = await prisma.$transaction(async (tx) => {
      // Upsert buyer
      const buyerRecord = await tx.nFT.upsert({
        where: {
          userId_mediaId: {
            userId: user.id,
            mediaId: media.id
          }
        },
        update: {
          ownerAddress: normalizedAddress,
          quantity: { increment: 1 }
        },
        create: {
          userId: user.id,
          mediaId: media.id,
          ownerAddress: normalizedAddress,
          quantity: 1
        }
      });

      // Decrement seller (artist)
      const sellerRecord = await tx.nFT.findUnique({
        where: {
          userId_mediaId: {
            userId: media.authorId,
            mediaId: media.id
          }
        }
      });

      if (sellerRecord && sellerRecord.quantity > 0) {
        await tx.nFT.update({
          where: { id: sellerRecord.id },
          data: { quantity: { decrement: 1 } }
        });
      }

      return buyerRecord;
    });

    console.log(`[Collect] Ownership recorded for user ${user.id} and media ${media.id}`);
    return NextResponse.json({ success: true, ownership });
  } catch (error: any) {
    console.error('[Collect] NFT Collection Sync Error:', error);
    return NextResponse.json({ 
      error: 'Failed to sync collection with database', 
      details: error.message 
    }, { status: 500 });
  }
}
