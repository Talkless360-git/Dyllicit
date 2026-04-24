import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up subscriptions...');
  
  const deleted = await prisma.subscription.deleteMany({});
  
  console.log(`Successfully deleted ${deleted.count} subscription records.`);
  console.log('All users are now unsubscribed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
