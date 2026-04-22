import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking for admin accounts...");
  
  const targetAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
  
  const users = await prisma.user.findMany();
  const admins = users.filter(u => u.address?.toLowerCase() === targetAddress.toLowerCase());
  
  console.log(`Found ${admins.length} matching user(s).`);
  
  if (admins.length === 0) {
    console.log("No user found with this address. One will be created automatically upon next login, but let's pre-create it to be sure.");
    const newUser = await prisma.user.create({
      data: {
        address: targetAddress,
        role: 'ADMIN',
        name: 'New Administrator'
      }
    });
    console.log(`Created new ADMIN user with ID: ${newUser.id}`);
  } else {
    for (const user of admins) {
      console.log(`Promoting user ${user.id} (${user.email || 'no email'}) to ADMIN...`);
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' }
      });
    }
  }

  console.log("✅ Admin promotion complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
