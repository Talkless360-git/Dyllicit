import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { 
      mediaData, 
      nftData,
      authorAddress 
    } = data;

    const normalizedAddress = authorAddress.toLowerCase();
    console.log(`[Sync] Starting sync for address: ${normalizedAddress}`);

    // 1. Ensure user exists (upsert)
    const user = await prisma.user.upsert({
      where: { address: normalizedAddress },
      update: {}, 
      create: { 
        address: normalizedAddress,
        role: 'USER'
      }
    });

    console.log(`[Sync] User identified: ${user.id}`);

    // 2. Create Media and NFT in a transaction
    const result = await prisma.$transaction(async (tx) => {
      console.log(`[Sync] Creating Media record: ${mediaData.title}`);
      const media = await tx.media.create({
        data: {
          ...mediaData,
          tokenId: nftData.tokenId,
          contractAddr: nftData.contractAddr,
          metadataUrl: nftData.metadataUrl,
          authorId: user.id
        }
      });

      console.log(`[Sync] Creating Initial Ownership record for Media: ${media.id}`);
      const nft = await tx.nFT.create({
        data: {
          mediaId: media.id,
          userId: user.id,
          ownerAddress: normalizedAddress
        }
      });

      // Elevate user to ARTIST if they are just a regular USER
      if (user.role === 'USER' || user.role === 'LISTENER') {
        await tx.user.update({
          where: { id: user.id },
          data: { role: 'ARTIST' }
        });
      }

      return { media, nft };
    });

    console.log(`[Sync] Sync successful for Media: ${result.media.id}`);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Sync] NFT Sync Error:', error);
    return NextResponse.json({ 
      error: 'Failed to sync NFT with database', 
      details: error.message 
    }, { status: 500 });
  }
}
