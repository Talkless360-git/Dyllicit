const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function settleOldStreams() {
  console.log("Starting retroactive settlement...");
  
  // 1. Find all unsettled streams
  const unsettledStreams = await prisma.stream.findMany({
    where: { isSettled: false },
    include: {
      media: {
        include: { author: true }
      }
    }
  });

  console.log(`Found ${unsettledStreams.length} unsettled streams.`);
  const pricePerStream = 0.0001;
  let totalDistributed = 0;

  for (const stream of unsettledStreams) {
    const media = stream.media;
    const author = media.author;
    
    // Calculate fractional split
    const settings = await prisma.globalSettings.findUnique({ where: { id: "global" } });
    const platformFeePercent = settings?.platformFee || 2.5;

    // Calculate split
    const platformCut = (pricePerStream * platformFeePercent) / 100;
    const remainingRoyalty = pricePerStream - platformCut;
    
    const holdersPercentage = media.fractionalRoyalty || 0;
    const totalHoldersShare = (remainingRoyalty * holdersPercentage) / 100;
    const artistShare = remainingRoyalty - totalHoldersShare;

    // Credit Admin
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (adminUser) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { royaltyBalance: { increment: platformCut } }
      });
    }

    // Credit Artist
    await prisma.user.update({
      where: { id: author.id },
      data: { royaltyBalance: { increment: artistShare } }
    });

    // Credit Holders
    if (totalHoldersShare > 0) {
      const nfts = await prisma.nFT.findMany({
        where: { mediaId: media.id, userId: { not: author.id } }
      });
      for (const nft of nfts) {
        const holderShare = (totalHoldersShare * nft.quantity) / media.totalShares;
        await prisma.user.update({
          where: { id: nft.userId },
          data: { royaltyBalance: { increment: holderShare } }
        });
      }
    }

    // Mark as settled
    await prisma.stream.update({
      where: { id: stream.id },
      data: { isSettled: true }
    });
    
    totalDistributed += totalRoyalty;
  }

  console.log(`Successfully distributed ${totalDistributed.toFixed(4)} ETH across ${unsettledStreams.length} streams.`);
}

settleOldStreams()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
