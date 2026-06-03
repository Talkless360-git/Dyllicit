import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("DATABASE_URL in script:", process.env.DATABASE_URL);
  
  // Run raw SQL query to inspect User table columns
  const columns: any = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'User'
  `;
  
  console.log("Actual columns in 'User' table in PostgreSQL:");
  console.log(columns);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());


