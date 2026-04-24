import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pending = await prisma.artistSettlement.findMany({
    where: { isPaid: false },
    include: { artist: true }
  });
  console.log('Pending Settlements:', JSON.stringify(pending, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
