import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting data reset for streaming and royalities...");

  // 1. Delete all Streaming and Royalty records
  // Order matters for foreign keys
  const deleteArtistSettlements = await prisma.artistSettlement.deleteMany();
  console.log(`✅ Deleted ${deleteArtistSettlements.count} artist settlement records.`);

  const deleteRoyaltySettlements = await prisma.royaltySettlement.deleteMany();
  console.log(`✅ Deleted ${deleteRoyaltySettlements.count} royalty settlement records.`);

  const deleteStreams = await prisma.stream.deleteMany();
  console.log(`✅ Deleted ${deleteStreams.count} stream records.`);

  // 2. Delete Royalty Transactions
  const deleteTransactions = await prisma.transaction.deleteMany({
    where: {
      type: "royalty"
    }
  });
  console.log(`✅ Deleted ${deleteTransactions.count} royalty transaction records.`);

  // 3. Reset User Royalty Balances
  const updateUsers = await prisma.user.updateMany({
    data: {
      royaltyBalance: 0,
      totalPaidOut: 0
    }
  });
  console.log(`✅ Reset balances for ${updateUsers.count} users.`);

  // 4. Reset Media Play Counts
  const updateMedia = await prisma.media.updateMany({
    data: {
      playCount: 0
    }
  });
  console.log(`✅ Reset play counts for ${updateMedia.count} media items.`);

  console.log("✨ Data reset complete! You can now start fresh testing.");
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
