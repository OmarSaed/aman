const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

async function test() {
  const po = await prisma.purchaseOrder.findFirst({
    where: { status: 'Draft' },
    include: { items: true }
  });
  
  if (!po) {
    console.log('No draft PO found');
    return;
  }
  
  const wh = await prisma.warehouse.findFirst();
  
  const payload = JSON.stringify({
    warehouseId: wh.id,
    receiveItems: po.items.map(i => ({ itemId: i.id, quantityReceived: i.quantityOrdered }))
  });
  
  const token = 'MOCK_TOKEN_OR_BYPASS'; 
  console.log('We cannot easily mock JWT. Let me just simulate the controller logic instead.');
}

test().catch(console.error).finally(()=> prisma.$disconnect());
