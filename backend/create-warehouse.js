const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.warehouse.create({ data: { name: 'Main Warehouse' } });
  console.log('Warehouse created');
}

main().catch(console.error).finally(() => prisma.$disconnect());
