import { allCustomers } from "~/data/admin-customers";
import { allOrders, placedOrderOf } from "~/data/admin-orders";
import { allProducts, savedExtras } from "~/data/admin-products";
import { categoryMeta } from "~/data/product-meta";
import type { OrderRow } from "~/types/admin/orders";
import type {
  AnalyticsQuery,
  AnalyticsRange,
  AnalyticsResponse,
  CategoryRow,
  Cohort,
  EffectiveGranularity,
  FunnelStage,
  Granularity,
  RegionRow,
  TimePoint,
  TopProductRow,
  TopProductsResponse,
  VelocityStatus,
  TopQuery,
} from "~/types/admin/analytics";
import type { Product, ProductCategory } from "~/types/admin/products";

// Reporting over the real orders, products and customers. Figures the shop does not record
// (visits, page views, conversion) are not invented: they stay at zero.

const today = () => new Date().toISOString().slice(0, 10);
const DAY = 86_400_000;
const HOUR = 3_600_000;
const ts = (d: string) => Date.parse(`${d}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => iso(ts(d) + n * DAY);
const daysBetween = (from: string, to: string) => Math.round((ts(to) - ts(from)) / DAY) + 1;

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

const isDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(ts(v));

export const parseAnalyticsQuery = (raw: Record<string, unknown>): AnalyticsQuery => ({
  range: pick<AnalyticsRange>(raw.range, ["today", "7d", "30d", "quarter", "ytd", "custom"], "30d"),
  from: isDate(raw.from) ? raw.from : addDays(today(), -30),
  to: isDate(raw.to) ? raw.to : today(),
  granularity: pick<Granularity>(raw.granularity, ["day", "week", "month"], "week"),
  cohort: pick<Cohort>(raw.cohort, ["all", "enterprise", "business", "printShop"], "all"),
});

/** Turns a range choice into concrete dates. A custom range is put in order and kept to a year. */
export const resolveRange = (q: Pick<AnalyticsQuery, "range" | "from" | "to">) => {
  const now = today();
  let from: string;
  let to: string = now;
  switch (q.range) {
    case "today":
      from = now;
      break;
    case "7d":
      from = addDays(now, -6);
      break;
    case "30d":
      from = addDays(now, -30);
      break;
    case "quarter": {
      // The last full calendar quarter.
      const y = Number(now.slice(0, 4));
      const startMonth = Math.floor((Number(now.slice(5, 7)) - 1) / 3) * 3;
      const qStart = Date.UTC(y, startMonth, 1);
      from = iso(Date.UTC(y, startMonth - 3, 1));
      to = iso(qStart - DAY);
      break;
    }
    case "ytd":
      from = `${now.slice(0, 4)}-01-01`;
      break;
    default: {
      [from, to] = q.from <= q.to ? [q.from, q.to] : [q.to, q.from];
      if (to > now) to = now;
      if (from > to) from = to;
      if (daysBetween(from, to) > 366) from = addDays(to, -365);
    }
  }
  const days = daysBetween(from, to);
  return { from, to, days, prevFrom: addDays(from, -days), prevTo: addDays(from, -1) };
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
/** Change against the period before, in percent; 0 when there was nothing to compare with. */
const change = (now: number, before: number) => (before ? round1(((now - before) / before) * 100) : 0);

// --- What the orders say ---

const isPaid = (o: OrderRow) => o.stage !== "awaitingPayment";
const at = (o: OrderRow) => Date.parse(o.placedAt);
const within = (rows: OrderRow[], from: number, to: number) => rows.filter((o) => at(o) >= from && at(o) < to);
const total = (rows: OrderRow[]) => rows.reduce((s, o) => s + o.amount, 0);

/** Profit on an order's lines, counting only products whose cost has been entered. */
const marginOn = (o: OrderRow, products: Product[]) => {
  let m = 0;
  for (const l of placedOrderOf(o.id)?.lines ?? []) {
    const p = products.find((x) => x.sku === l.sku);
    const cost = p ? savedExtras(p.id)?.cost : null;
    if (cost != null) m += l.total - cost * l.quantity;
  }
  return m;
};

const REGION_OF_NODE: Record<string, RegionRow["key"]> = {
  cairo: "cairo",
  giza: "cairo",
  alexandria: "delta",
  mansoura: "delta",
  tanta: "delta",
  riyadh: "gulf",
  dubai: "gulf",
  jeddah: "gulf",
  doha: "gulf",
  "kuwait city": "gulf",
  amman: "levant",
  luxor: "levant",
};
const REGION_KEYS: RegionRow["key"][] = ["cairo", "delta", "gulf", "levant"];

export const buildAnalytics = (query: AnalyticsQuery): AnalyticsResponse => {
  const period = resolveRange(query);
  const products = allProducts();
  const customers = allCustomers();

  const everyOrder = allOrders();
  const scoped = query.cohort === "all" ? everyOrder : everyOrder.filter((o) => o.customer.tier === query.cohort);

  const from = ts(period.from);
  const to = ts(period.to) + DAY;
  const prevFrom = ts(period.prevFrom);
  const orders = within(scoped, from, to);
  const prevOrders = within(scoped, prevFrom, from);
  const paid = orders.filter(isPaid);
  const prevPaid = prevOrders.filter(isPaid);

  // One day is shown by the hour; very long ranges are made coarser so the chart stays readable.
  let granularity: EffectiveGranularity = period.days === 1 ? "hour" : query.granularity;
  if (granularity === "day" && period.days > 62) granularity = "week";
  if (granularity === "week" && Math.ceil(period.days / 7) > 62) granularity = "month";

  const n =
    granularity === "hour"
      ? 24
      : granularity === "day"
        ? period.days
        : granularity === "week"
          ? Math.ceil(period.days / 7)
          : Math.ceil(period.days / 30.4);
  const perPoint = granularity === "hour" ? HOUR : (period.days / n) * DAY;
  const shift = period.days * DAY;

  const series: TimePoint[] = Array.from({ length: n }, (_, i) => {
    const start = from + Math.round(i * perPoint);
    const end = i === n - 1 ? to : from + Math.round((i + 1) * perPoint);
    const slice = within(paid, start, end);
    return {
      at: granularity === "hour" ? `${period.from}T${String(i).padStart(2, "0")}:00` : iso(start),
      revenue: Math.round(total(slice)),
      prior: Math.round(total(within(prevPaid, start - shift, end - shift))),
      collected: Math.round(total(slice.filter((o) => o.stage === "completed"))),
      margin: Math.round(slice.reduce((s, o) => s + marginOn(o, products), 0)),
    };
  });

  const turnover = series.reduce((s, p) => s + p.revenue, 0);
  const priorTotal = series.reduce((s, p) => s + p.prior, 0);
  const peakIndex = series.reduce((best, p, i) => (p.revenue > series[best]!.revenue ? i : best), 0);

  const aov = paid.length ? round2(turnover / paid.length) : 0;
  const prevAov = prevPaid.length ? total(prevPaid) / prevPaid.length : 0;

  // A short line for the first card: the series squeezed into twelve steps.
  const trend = Array.from({ length: 12 }, (_, k) => {
    const lo = Math.floor((k * series.length) / 12);
    const hi = Math.max(lo + 1, Math.floor(((k + 1) * series.length) / 12));
    const slice = series.slice(lo, hi);
    return slice.length ? slice.reduce((s, p) => s + p.revenue, 0) / slice.length : 0;
  });

  // The order pipeline. Visits and page views are not tracked, so the funnel starts at orders placed.
  const counts = [
    0,
    0,
    orders.length,
    paid.length,
    orders.filter((o) => o.stage === "inTransit" || o.stage === "completed").length,
  ];
  const keys: FunnelStage["key"][] = ["sessions", "inspections", "carts", "wire", "dispatched"];
  const top = Math.max(...counts);
  const stages: FunnelStage[] = counts.map((count, i) => ({
    key: keys[i]!,
    count,
    pct: top ? round2((count / top) * 100) : 0,
    drop: i && counts[i - 1]! > 0 ? round2((1 - count / counts[i - 1]!) * 100) : null,
  }));

  // Revenue and margin per product category, from the lines on paid orders.
  const byCategory = new Map<ProductCategory, { revenue: number; prior: number; profit: number; costed: number }>();
  const addLines = (rows: OrderRow[], field: "revenue" | "prior") => {
    for (const o of rows) {
      for (const l of placedOrderOf(o.id)?.lines ?? []) {
        const p = products.find((x) => x.sku === l.sku);
        if (!p) continue;
        const cur = byCategory.get(p.category) ?? { revenue: 0, prior: 0, profit: 0, costed: 0 };
        cur[field] += l.total;
        const cost = savedExtras(p.id)?.cost;
        if (field === "revenue" && cost != null) {
          cur.profit += l.total - cost * l.quantity;
          cur.costed += l.total;
        }
        byCategory.set(p.category, cur);
      }
    }
  };
  addLines(paid, "revenue");
  addLines(prevPaid, "prior");
  const categoryTotal = [...byCategory.values()].reduce((s, c) => s + c.revenue, 0);
  const categories: CategoryRow[] = (Object.keys(categoryMeta) as ProductCategory[]).map((category) => {
    const c = byCategory.get(category);
    return {
      category,
      revenue: Math.round(c?.revenue ?? 0),
      share: categoryTotal ? round1(((c?.revenue ?? 0) / categoryTotal) * 100) : 0,
      yoy: change(c?.revenue ?? 0, c?.prior ?? 0),
      margin: c?.costed ? round1((c.profit / c.costed) * 100) : 0,
    };
  });
  const costed = [...byCategory.values()].reduce((s, c) => s + c.costed, 0);
  const profit = [...byCategory.values()].reduce((s, c) => s + c.profit, 0);

  // Cohort tiles always show the whole book, whichever cohort the filter has chosen.
  const book = within(everyOrder, from, to);
  const bookPrev = within(everyOrder, prevFrom, from);
  const bookRevenue = total(book.filter(isPaid));
  const cohorts = (["enterprise", "business", "printShop"] as const).map((key) => {
    const mine = book.filter((o) => o.customer.tier === key);
    const before = bookPrev.filter((o) => o.customer.tier === key);
    return {
      key,
      share: bookRevenue ? round1((total(mine.filter(isPaid)) / bookRevenue) * 100) : 0,
      yoy: change(total(mine.filter(isPaid)), total(before.filter(isPaid))),
      orders: mine.length,
    };
  });

  const regionOf = (o: OrderRow): RegionRow["key"] => {
    const node = customers.find((c) => c.name === o.customer.name)?.node ?? "";
    return REGION_OF_NODE[node.toLowerCase()] ?? "cairo";
  };
  const regions: RegionRow[] = REGION_KEYS.map((key) => {
    const mine = orders.filter((o) => regionOf(o) === key);
    const revenue = Math.round(total(mine.filter(isPaid)));
    return { key, share: turnover ? round1((revenue / turnover) * 100) : 0, revenue, orders: mine.length };
  });

  const newClients = (a: number, b: number) =>
    customers.filter((c) => Date.parse(c.createdAt) >= a && Date.parse(c.createdAt) < b).length;
  const intake = newClients(from, to);

  return {
    query,
    period,
    granularity,
    kpis: {
      turnover,
      turnoverDelta: change(turnover, priorTotal),
      turnoverChange: turnover - priorTotal,
      orders: orders.length,
      ordersDelta: change(orders.length, prevOrders.length),
      inProgress: orders.filter((o) => o.stage === "checking" || o.stage === "packing" || o.stage === "inTransit").length,
      aov,
      aovDelta: change(aov, prevAov),
      conversion: 0,
      conversionDelta: 0,
      sessions: 0,
      intake,
      intakeDelta: change(intake, newClients(prevFrom, from)),
      trend,
    },
    series,
    peakIndex,
    funnel: { stages, conversion: 0, velocityHours: 0 },
    categories,
    portfolioMargin: costed ? round1((profit / costed) * 100) : 0,
    cohorts,
    regions,
    accounts: new Set(book.map((o) => o.customer.name)).size,
    onTimePct: 0,
  };
};

// --- Best-selling products ---

const statusOf = (daysLeft: number): VelocityStatus =>
  daysLeft <= 10 ? "restock" : daysLeft <= 20 ? "low" : daysLeft <= 35 ? "optimal" : "healthy";

export const parseTopQuery = (raw: Record<string, unknown>): TopQuery => {
  const base = parseAnalyticsQuery(raw);
  const page = Number.parseInt(String(raw.page), 10);
  return {
    q: typeof raw.q === "string" ? raw.q.trim().slice(0, 80) : "",
    category: pick(raw.category, ["all", "printers", "copiers", "inks-toner"] as const, "all"),
    page: Number.isFinite(page) ? Math.min(100_000, Math.max(1, page)) : 1,
    perPage: Number(pick(String(raw.perPage), ["5", "10", "25"] as const, "5")),
    range: base.range,
    from: base.from,
    to: base.to,
  };
};

export const queryTopProducts = (query: TopQuery): TopProductsResponse => {
  const { days, from, to } = resolveRange(query);
  const needle = query.q.toLowerCase();

  // Units and revenue sold in the period, by SKU.
  const sold = new Map<string, { units: number; revenue: number }>();
  for (const o of within(allOrders().filter(isPaid), ts(from), ts(to) + DAY)) {
    for (const l of placedOrderOf(o.id)?.lines ?? []) {
      const cur = sold.get(l.sku) ?? { units: 0, revenue: 0 };
      cur.units += l.quantity;
      cur.revenue += l.total;
      sold.set(l.sku, cur);
    }
  }

  const ranked = allProducts()
    .filter(
      (p) =>
        (query.category === "all" || p.category === query.category) &&
        (!needle || [p.name, p.sku, p.spec].join(" ").toLowerCase().includes(needle)),
    )
    .map((p) => {
      const s = sold.get(p.sku) ?? { units: 0, revenue: 0 };
      const perDay = s.units / days;
      // With no sales there is nothing to run out of: shown as a year of cover.
      const daysLeft = perDay > 0 ? Math.floor(p.stock / perDay) : 365;
      const cost = savedExtras(p.id)?.cost;
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        spec: p.spec,
        icon: p.icon,
        category: p.category,
        units: s.units,
        revenue: Math.round(s.revenue),
        margin: cost != null && p.price > 0 ? round1(((p.price - cost) / p.price) * 100) : 0,
        daysLeft,
        perDay: round1(perDay),
        status: statusOf(daysLeft),
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.units - a.units);

  const pageCount = Math.max(1, Math.ceil(ranked.length / query.perPage));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * query.perPage;
  const rows: TopProductRow[] = ranked.slice(start, start + query.perPage).map((r, i) => ({ ...r, rank: start + i + 1 }));

  return {
    rows,
    total: ranked.length,
    totalUnits: rows.reduce((s, r) => s + r.units, 0),
    totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
  };
};

export const categoryLabel = (c: ProductCategory) => categoryMeta[c].label;
