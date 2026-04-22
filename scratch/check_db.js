const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mediaCount = await prisma.media.count();
  const nftsCount = await prisma.nft.count();
  const usersCount = await prisma.user.count();
  console.log('Stats:', { mediaCount, nftsCount, usersCount });
  const allMedia = await prisma.media.findMany({ include: { author: true } });
  console.log('All Media:', JSON.stringify(allMedia, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
