const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.warehouse.create({ data: { name: 'Main Warehouse', location: 'HQ' } });
  console.log('Warehouse created');
}
main().finally(() => prisma.$disconnect());
