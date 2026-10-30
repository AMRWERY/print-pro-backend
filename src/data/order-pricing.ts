import type { AccountTier, OrderPricing } from "~/types/admin/orders";

// One pricing rule for every place an order total is shown (order list, detail page, create
// form), so the numbers always agree.

export const SETUP_FEE = 120;
export const COURIER_FEE = 145;
export const VAT_RATE = 0.14;

export const tierDiscount: Record<AccountTier, number> = {
  enterprise: 0.05,
  business: 0.03,
  printShop: 0.02,
  home: 0,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const orderPricing = (
  lines: { unitPrice: number; quantity: number }[],
  tier: AccountTier,
): OrderPricing => {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
  const discountRate = tierDiscount[tier];
  const discount = round2(subtotal * discountRate);
  const net = subtotal + SETUP_FEE + COURIER_FEE - discount;
  const vat = round2(net * VAT_RATE);
  return {
    subtotal,
    setupFee: SETUP_FEE,
    courier: COURIER_FEE,
    discountRate,
    discount,
    vat,
    total: round2(net + vat),
  };
};
