const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Resetting royalty data for a clean start...');
  
  // 1. Delete all settlements
  const s1 = await prisma.artistSettlement.deleteMany({});
  const s2 = await prisma.royaltySettlement.deleteMany({});
  console.log(`Deleted ${s1.count} artist settlements and ${s2.count} royalty settlements.`);
  
  // 2. Reset stream status so they can be re-settled
  const streams = await prisma.stream.updateMany({
    data: { isSettled: false }
  });
  console.log(`Reset ${streams.count} streams to 'unsettled' status.`);
  
  // 3. Reset artist royalty balances in DB
  const users = await prisma.user.updateMany({
    data: { royaltyBalance: 0 }
  });
  console.log(`Reset royalty balances for ${users.count} users.`);
  
  console.log('Done! You can now "Calculate & Settle" again with the corrected logic.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
