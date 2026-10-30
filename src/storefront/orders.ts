import { randomInt } from "node:crypto";
import { z } from "zod";
import { findProduct as findAdminProduct } from "~/data/admin-products";
import { markCouponUsed, redeemableCoupon } from "~/data/admin-coupons";
import { recordPlacedOrder } from "~/data/admin-orders";
import { persistentList } from "~/db/persist";
import { httpError } from "~/lib/http";
import type { OrderLine } from "~/types/admin/orders";
import type { Order, OrderAmounts, OrderItem } from "~/types/order";
import { findCatalogEntry, findSellable } from "./catalog";
import { pricing, vouchers } from "./data/cart";
import { deliveryOptions, deliveryPrices, paymentMethods } from "./data/checkout";
import { getProductDetail } from "./data/product-details";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A placed order plus who owns it. `id` is the public order number, e.g. "LP-948203". */
interface StoredOrder extends Order {
  userId?: string;
}
const store = persistentList<StoredOrder>("storefront-orders", () => []);

export const orderBody = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        qty: z.number().int().min(1).max(99),
        /** A package option id (or label) chosen on the product page. */
        option: z.string().max(120).optional(),
      }),
    )
    .min(1)
    .max(40),
  voucher: z.string().trim().max(40).optional(),
  contact: z.object({
    name: z.string().trim().min(1).max(120),
    company: z.string().trim().max(120).optional(),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(5).max(40),
  }),
  address: z.object({
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(100),
    region: z.string().trim().min(1).max(100),
    postal: z.string().trim().min(1).max(20),
    country: z.string().trim().min(2).max(2),
  }),
  delivery: z.enum(["crated", "express", "pickup"]),
  payment: z.object({
    id: z.enum(paymentMethods.map((m) => m.id) as [string, ...string[]]),
    /** The card number never reaches this server; the form sends the last four digits for the receipt. */
    last4: z.string().regex(/^\d{4}$/).optional(),
  }),
  notes: z.string().trim().max(1000).optional(),
});
export type OrderBody = z.infer<typeof orderBody>;

interface PricedLine {
  item: OrderItem;
  group: "printer" | "copier" | "ink";
  stock: number;
  adminId: string;
  unit: "item" | "pack";
}

/** Prices come from the catalog and the admin register, never from the browser. */
const priceLines = (items: OrderBody["items"]): PricedLine[] =>
  items.map((line) => {
    const entry = findCatalogEntry(line.id);
    const product = findSellable(line.id);
    if (!product) throw httpError(400, `Unknown product: ${line.id}`);
    // Products outside the catalog (home page extras) are only sellable when they have a price.
    if (!entry && !product.price) throw httpError(400, `${product.name} can't be ordered online`);

    const option = line.option
      ? getProductDetail(product).packages.find((o) => o.id === line.option || o.label === line.option)
      : undefined;
    if (line.option && !option) throw httpError(400, "Unknown package option");

    const sku = (product as { sku?: string }).sku;
    const adminProduct = entry?.adminId ? findAdminProduct(entry.adminId) : undefined;
    return {
      item: {
        key: `${product.id}${option ? `:${option.id}` : ""}`,
        id: product.id,
        name: product.name,
        brand: product.brand,
        qty: line.qty,
        unitPrice: product.price + (option?.delta ?? 0),
        option: option?.label,
        sku,
        icon: product.icon,
        image: product.image,
        imageAlt: product.imageAlt,
        specs: product.specs,
      },
      group: product.group,
      stock: entry?.stock ?? Infinity,
      adminId: adminProduct?.id ?? "",
      unit: adminProduct?.unit === "pack" ? "pack" : "item",
    };
  });

interface Totals {
  amounts: OrderAmounts;
  couponId?: string;
}

/** Same arithmetic the cart and checkout show: volume tier, voucher, free-freight threshold, tax. */
export const computeTotals = (lines: PricedLine[], voucherCode: string | undefined, delivery: OrderBody["delivery"]): Totals => {
  const units = lines.reduce((n, l) => n + l.item.qty, 0);
  const subtotal = round2(lines.reduce((n, l) => n + l.item.qty * l.item.unitPrice, 0));
  const volume = round2(
    lines.reduce(
      (n, l) =>
        l.group === "ink" && l.item.qty >= pricing.volumeMinQty ? n + l.item.qty * l.item.unitPrice * pricing.volumeRate : n,
      0,
    ),
  );
  const afterVolume = subtotal - volume;

  let voucher = 0;
  let voucherLabel: string | undefined;
  let freeShipping = false;
  let couponId: string | undefined;
  const code = voucherCode?.trim().toUpperCase();
  if (code) {
    const demo = Object.hasOwn(vouchers, code) ? vouchers[code] : undefined;
    const coupon = demo ? undefined : redeemableCoupon(code);
    if (demo) {
      if (!demo.minSubtotal || subtotal >= demo.minSubtotal) {
        voucher = round2(Math.min(demo.type === "flat" ? demo.amount : afterVolume * (demo.amount / 100), afterVolume));
        voucherLabel = demo.label;
      }
    } else if (coupon && subtotal >= coupon.minOrder) {
      couponId = coupon.id;
      voucherLabel = coupon.campaign;
      if (coupon.type === "freight") freeShipping = true;
      else {
        const raw = coupon.type === "percentage" ? Math.min((afterVolume * coupon.value) / 100, coupon.cap ?? Infinity) : coupon.value;
        voucher = round2(Math.min(raw, afterVolume));
      }
    }
  }

  const discounted = afterVolume - voucher;
  const shipping =
    delivery === "crated"
      ? freeShipping || !units || discounted >= pricing.freeFreightFrom
        ? 0
        : pricing.freight
      : freeShipping
        ? 0
        : deliveryPrices[delivery];
  const tax = round2(discounted * pricing.taxRate);
  return {
    couponId,
    amounts: { units, subtotal, volume, voucher, voucherLabel, shipping, tax, total: round2(discounted + shipping + tax) },
  };
};

/** Lets the cart show a voucher's effect before checkout. */
export const quoteVoucher = (items: OrderBody["items"], voucherCode: string, delivery: OrderBody["delivery"]) => {
  const { amounts } = computeTotals(priceLines(items), voucherCode, delivery);
  return { valid: amounts.voucher > 0 || amounts.shipping === 0, amounts };
};

const orderNumbers = () => {
  // 4 digits + 4 digits, the format the order page shows (e.g. 4821-9307).
  const d = String(randomInt(0, 100_000_000)).padStart(8, "0");
  return `${d.slice(0, 4)}-${d.slice(4)}`;
};

const tierOf = { business: "business", reseller: "printShop", home: "home" } as const;

export const placeOrder = (body: OrderBody, user?: { id: string; tier?: string }): Order => {
  const lines = priceLines(body.items);

  // Don't sell what the register says we don't have, unless the product is a made-to-order item.
  for (const l of lines) {
    if (l.stock < l.item.qty) throw httpError(409, `Only ${Math.max(0, l.stock)} of ${l.item.name} in stock`);
  }
  const { amounts, couponId } = computeTotals(lines, body.voucher, body.delivery);

  const delivery = deliveryOptions.find((o) => o.id === body.delivery)!;
  const payment = paymentMethods.find((m) => m.id === body.payment.id)!;

  const adminLines: OrderLine[] = lines.map((l) => ({
    sku: l.item.sku ?? l.item.id,
    title: l.item.name,
    spec: l.item.specs.join(" · "),
    icon: l.item.icon,
    quantity: l.item.qty,
    unit: l.unit,
    unitPrice: l.item.unitPrice,
    total: round2(l.item.unitPrice * l.item.qty),
  }));
  const discount = round2(amounts.volume + amounts.voucher);
  const address = body.address;

  const row = recordPlacedOrder({
    customer: {
      name: body.contact.name,
      org: body.contact.company || body.contact.name,
      tier: tierOf[(user?.tier as keyof typeof tierOf) ?? "home"] ?? "home",
    },
    lines: adminLines,
    pricing: {
      subtotal: amounts.subtotal,
      setupFee: 0,
      courier: amounts.shipping,
      discountRate: amounts.subtotal ? round2(discount / amounts.subtotal) : 0,
      discount,
      vat: amounts.tax,
      total: amounts.total,
    },
    // No payment gateway is connected yet, so nothing is "paid" until an admin moves the order on.
    paid: false,
    contact: {
      email: body.contact.email,
      phone: body.contact.phone,
      address: [address.line1, address.line2, address.city, address.region, address.postal, address.country].filter(Boolean).join(", "),
    },
    userId: user?.id,
  });

  // Take the stock and count the coupon only once the order exists.
  for (const l of lines) {
    const a = l.adminId ? findAdminProduct(l.adminId) : undefined;
    if (a) a.stock = Math.max(0, a.stock - l.item.qty);
  }
  if (couponId) markCouponUsed(couponId);

  const order: StoredOrder = {
    id: row.id.slice(1),
    createdAt: row.placedAt,
    name: body.contact.name,
    company: body.contact.company || undefined,
    email: body.contact.email,
    phone: body.contact.phone,
    address: { ...address, line2: address.line2 || undefined },
    delivery: { id: delivery.id, label: delivery.label, note: delivery.note, days: delivery.days },
    payment: { id: payment.id, label: payment.label, last4: payment.id === "card" ? body.payment.last4 : undefined },
    notes: body.notes || undefined,
    items: lines.map((l) => l.item),
    amounts,
    pin: orderNumbers(),
    userId: user?.id,
  };
  store.unshift(order);
  return stripOwner(order);
};

const stripOwner = ({ userId: _userId, ...order }: StoredOrder): Order => order;

/** The owner sees their order by signing in; anyone else needs the order number and its PIN. */
export const findOrderFor = (id: string, access: { userId?: string; pin?: string }): Order | undefined => {
  const o = store.find((x) => x.id === id);
  if (!o) return undefined;
  const owns = !!access.userId && o.userId === access.userId;
  const pinOk = !!access.pin && access.pin.trim() === o.pin;
  return owns || pinOk ? stripOwner(o) : undefined;
};

export const ordersOfUser = (userId: string): Order[] => store.filter((o) => o.userId === userId).map(stripOwner);

