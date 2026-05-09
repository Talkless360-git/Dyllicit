const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMedia() {
  const media = await prisma.media.findMany({
    take: 10,
    select: { id: true, title: true, url: true, isGated: true }
  });
  console.log(JSON.stringify(media, null, 2));
}

checkMedia()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
