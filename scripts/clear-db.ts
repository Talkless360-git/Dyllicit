import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all user and platform data...');

  try {
    // Delete in reverse order of dependencies
    await prisma.artistSettlement.deleteMany();
    await prisma.royaltySettlement.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.like.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.stream.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.playlistItem.deleteMany();
    await prisma.playlist.deleteMany();
    await prisma.nFT.deleteMany();
    await prisma.media.deleteMany();
    await prisma.account.deleteMany();
    await prisma.session.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.user.deleteMany();
    
    // Optional: Reset global settings
    await prisma.globalSettings.deleteMany();
    await prisma.globalSettings.create({
      data: {
        id: "global",
        platformFee: 2.5,
        defaultRoyalty: 5.0
      }
    });

    console.log('Database cleared successfully.');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
