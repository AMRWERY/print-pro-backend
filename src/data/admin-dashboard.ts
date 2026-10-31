import { allOrders, placedOrderOf } from "~/data/admin-orders";
import { allCustomers } from "~/data/admin-customers";
import { allProducts } from "~/data/admin-products";
import type { OrderRow, OrderStage } from "~/types/admin/orders";
import type { Product } from "~/types/admin/products";
import type {
  DashboardSummary,
  LowStockItem,
  OrderStatus,
  OrderSummaryRow,
  RangeKey,
  RecentCustomer,
  RevenueSeries,
  RevenueUnit,
  TopProduct,
} from "~/types/admin/dashboard";

// The executive bench: every figure is worked out from the real orders, products and customers.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Revenue counts once an order is paid, so orders still awaiting payment are left out. */
const isPaid = (o: OrderRow) => o.stage !== "awaitingPayment";
const at = (o: OrderRow) => Date.parse(o.placedAt);
const sum = (rows: OrderRow[]) => rows.reduce((s, o) => s + o.amount, 0);
/** Change against the period before, in percent; 0 when there was nothing to compare with. */
const change = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 1000) / 10 : 0);

const between = (rows: OrderRow[], from: number, to: number) => rows.filter((o) => at(o) >= from && at(o) < to);

const lowStockOf = (p: Product): LowStockItem => {
  const critical = p.stock === 0 || p.stock <= Math.floor(p.min / 2);
  return {
    sku: p.sku,
    name: p.name,
    spec: p.spec,
    status: critical ? "critical" : "depleting",
    remaining: p.stock,
    threshold: p.min,
    unit: p.unit === "pack" ? "packs" : p.category === "inks-toner" ? "cartridges" : "units",
    note: "priority",
    noteValue: p.stock === 0 ? "Out of stock" : "Below reorder point",
    action:
      p.category === "inks-toner" ? "restockToner" : critical && p.category === "copiers" ? "emergencySpares" : "restockMachines",
  };
};

const ACTION: Record<OrderStage, OrderSummaryRow["action"]> = {
  awaitingPayment: "viewOrder",
  checking: "completeOrder",
  packing: "checkBatch",
  inTransit: "printDeliveryNote",
  completed: "viewOrder",
};

const allocationOf = (o: OrderRow) => {
  const lines = placedOrderOf(o.id)?.lines ?? [];
  if (!lines.length) return `${o.allocation.quantity}× ${o.allocation.title}`;
  const shown = lines.slice(0, 2).map((l) => `${l.quantity}× ${l.title}`);
  return lines.length > 2 ? `${shown.join(" · ")} · +${lines.length - 2} more` : shown.join(" · ");
};

const divisionOf = (p: Product | undefined, title: string): TopProduct["division"] =>
  !p
    ? "printers"
    : p.category === "copiers"
      ? "copiers"
      : p.category === "printers"
        ? "printers"
        : /toner|drum/i.test(title)
          ? "toner"
          : "ink";

const tierOf = (segment: string): RecentCustomer["tier"] =>
  segment === "enterprise" || segment === "business" || segment === "printShop" || segment === "home" ? segment : "business";

export const dashboardSummary = (): DashboardSummary => {
  const now = Date.now();
  const orders = allOrders();
  const paid = orders.filter(isPaid);
  const products = allProducts();
  const customers = allCustomers();

  const thisMonth = between(paid, now - 30 * DAY, now + DAY);
  const lastMonth = between(paid, now - 60 * DAY, now - 30 * DAY);
  const ordersNow = between(orders, now - 30 * DAY, now + DAY).length;
  const ordersBefore = between(orders, now - 60 * DAY, now - 30 * DAY).length;

  // Twelve even steps over the last 30 days for the small trend line.
  const trend = Array.from({ length: 12 }, (_, k) => {
    const from = now - 30 * DAY + (k * 30 * DAY) / 12;
    return Math.round(sum(between(paid, from, from + (30 * DAY) / 12)));
  });

  const low = products.filter((p) => p.status !== "draft" && p.stock <= p.min).map(lowStockOf);
  const pending = orders.filter((o) => o.stage === "awaitingPayment");

  // Best sellers by revenue, from the lines on paid orders.
  const bySku = new Map<string, TopProduct>();
  for (const o of paid) {
    for (const l of placedOrderOf(o.id)?.lines ?? []) {
      const p = products.find((x) => x.sku === l.sku);
      const cur = bySku.get(l.sku);
      if (cur) {
        cur.volume += l.quantity;
        cur.revenue += l.total;
      } else {
        bySku.set(l.sku, {
          rank: 0,
          name: l.title,
          spec: l.spec,
          division: divisionOf(p, l.title),
          unitValue: l.unitPrice,
          volume: l.quantity,
          volumeUnit: l.unit === "pack" ? "packs" : p?.category === "inks-toner" ? "cartridges" : "units",
          revenue: l.total,
          qa: p?.category === "inks-toner" ? "GENUINE" : "100% TESTED",
          icon: l.icon,
        });
      }
    }
  }
  const topProducts = [...bySku.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((t, i) => ({ ...t, rank: i + 1 }));

  const recent = [...orders].sort((a, b) => at(b) - at(a)).slice(0, 5);
  const overdue = pending.filter((o) => now - at(o) > DAY).length;

  return {
    kpis: {
      revenue: { value: Math.round(sum(thisMonth)), delta: change(sum(thisMonth), sum(lastMonth)), trend },
      orders: { value: orders.length, delta: change(ordersNow, ordersBefore) },
      customers: {
        value: customers.length,
        delta: customers.filter((c) => Date.parse(c.createdAt) >= now - 30 * DAY).length,
      },
      products: { value: products.length },
      lowStock: { value: low.length },
      pendingOrders: { value: pending.length },
    },
    lowStock: low.sort((a, b) => a.remaining - b.remaining).slice(0, 4),
    topProducts,
    orders: {
      total: pending.length,
      // Share of waiting orders that have not been left unpaid for more than a day.
      slaPct: pending.length ? Math.round(((pending.length - overdue) / pending.length) * 100) : 100,
      rows: recent.map((o) => ({
        id: o.id,
        client: o.customer.name,
        location: o.customer.org,
        allocation: allocationOf(o),
        amount: o.amount,
        status: o.stage as OrderStatus,
        action: ACTION[o.stage],
      })),
    },
    customers: [...customers]
      .sort((a, b) => b.ltv - a.ltv)
      .slice(0, 4)
      .map((c) => ({
        initials: c.initials,
        name: c.org || c.name,
        location: c.node,
        lifetimeValue: c.ltv,
        tier: tierOf(c.segment),
      })),
  };
};

const RANGES: Record<RangeKey, { count: number; unit: RevenueUnit; step: number }> = {
  today: { count: 24, unit: "hour", step: HOUR },
  week: { count: 7, unit: "day", step: DAY },
  month: { count: 30, unit: "day", step: DAY },
  quarter: { count: 13, unit: "week", step: 7 * DAY },
  year: { count: 12, unit: "month", step: 30 * DAY },
};

export const isRangeKey = (value: unknown): value is RangeKey =>
  typeof value === "string" && Object.hasOwn(RANGES, value);

/** Paid revenue and order counts in even steps ending now. */
export const revenueSeries = (range: RangeKey): RevenueSeries => {
  const { count, unit, step } = RANGES[range];
  const now = Date.now();
  const paid = allOrders().filter(isPaid);
  const start = now - count * step;
  const points = Array.from({ length: count }, (_, i) => {
    const rows = between(paid, start + i * step, start + (i + 1) * step + (i === count - 1 ? 1 : 0));
    return { revenue: Math.round(sum(rows)), orders: rows.length };
  });
  const peakIndex = points.reduce((best, p, i) => (p.revenue > points[best]!.revenue ? i : best), 0);
  return { range, unit, points, peakIndex };
};
