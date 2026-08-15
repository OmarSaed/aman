const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // Keep a separate instance if not using tx

/**
 * Recalculates product cost based on the system or product-specific pricing strategy.
 * @param {string} productId - ID of the product
 * @param {object} tx - Prisma transaction client (optional)
 * @returns {Promise<object>} Updated product
 */
async function recalculateProductCost(productId, tx = prisma) {
  // 1. Fetch product, active PO receipts, and static prices
  const prd = await tx.product.findUnique({ where: { id: productId } });
  if (!prd) throw new Error(`Product with ID ${productId} not found`);

  if (prd.isPriceLocked) {
    return prd;
  }

  // Active PO items (POs that are Received or Partial)
  const poItems = await tx.purchaseOrderItem.findMany({
    where: { 
      productId,
      purchaseOrder: { status: { in: ['Received', 'Partial'] } },
      quantityReceived: { gt: 0 }
    }
  });

  // Manual/Static prices entered via the Suppliers tab
  const staticPrices = await tx.supplierProduct.findMany({
    where: { 
      productId,
      quantity: 0 
    }
  });

  const sys = await tx.systemSetting.findFirst();
  const strategy = prd.overridePricingStrategy || (sys ? sys.defaultPricingStrategy : 'Average');

  // 2. Determine base cost pool
  const poPrices = poItems.map(item => parseFloat(item.unitPrice));
  const manualPrices = staticPrices.map(sp => parseFloat(sp.supplierPrice));

  let newCost = 0;

  // PRIORITY 1: Active POs
  if (poPrices.length > 0) {
    if (strategy === 'Lowest') {
      newCost = Math.min(...poPrices);
    } else if (strategy === 'Highest') {
      newCost = Math.max(...poPrices);
    } else if (strategy === 'Average') {
      const poVolume = poItems.reduce((sum, item) => sum + item.quantityReceived, 0);
      const poValuation = poItems.reduce((sum, item) => sum + (parseFloat(item.unitPrice) * item.quantityReceived), 0);
      newCost = poValuation / poVolume;
    }
  } 
  // PRIORITY 2: Manual/Static Prices (Fallback if no POs)
  else if (manualPrices.length > 0) {
    if (strategy === 'Lowest') {
      newCost = Math.min(...manualPrices);
    } else if (strategy === 'Highest') {
      newCost = Math.max(...manualPrices);
    } else {
      newCost = manualPrices.reduce((a, b) => a + b, 0) / manualPrices.length;
    }
  }
  // PRIORITY 3: Legacy/Original Cost (Only if nothing else is found)
  else {
    // If we've literally returned everything and have no static prices, 
    // it could stay 0 or we could keep the very first costPrice. 
    // Usually, resetting to 0 is safer for accurate inventory valuation.
    newCost = 0; 
  }

  // 3. Update product cost
  const updatedProduct = await tx.product.update({
    where: { id: productId },
    data: { costPrice: newCost }
  });

  return updatedProduct;
}

module.exports = { recalculateProductCost };
