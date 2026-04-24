import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const unsettled = await prisma.stream.count({
    where: { isSettled: false }
  });
  console.log('Unsettled Streams:', unsettled);
}

main().catch(console.error).finally(() => prisma.$disconnect());
