const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up subscriptions...');
  const deleted = await prisma.subscription.deleteMany({});
  console.log(`Successfully deleted ${deleted.count} subscription records.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
