const prisma = require('../src/lib/db/prisma').default;

async function main() {
  console.log('Prisma keys:', Object.keys(prisma).filter(k => !k.startsWith('_')));
}

main().catch(console.error);
