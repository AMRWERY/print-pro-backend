import { allProducts } from "~/data/admin-products";
import { categoryMeta } from "~/data/product-meta";
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
  TopQuery
} from "~/types/admin/analytics";
import type { ProductCategory } from "~/types/admin/products";

// Demo analytics. Everything is derived from the chosen period, interval and cohort with fixed
// formulas, so the same query always gives the same numbers. When the app has a backend this
// file goes away and server/api/admin/analytics/* proxies the real reporting service.

/** The book has a fixed "today" so ranges are stable between reloads. */
const TODAY = "2026-10-31";
const DAY = 86_400_000;
const ts = (d: string) => Date.parse(`${d}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => iso(ts(d) + n * DAY);
const daysBetween = (from: string, to: string) =>
  Math.round((ts(to) - ts(from)) / DAY) + 1;

const pick = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;

const isDate = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(ts(v));

export const parseAnalyticsQuery = (
  raw: Record<string, unknown>,
): AnalyticsQuery => ({
  range: pick<AnalyticsRange>(
    raw.range,
    ["today", "7d", "30d", "quarter", "ytd", "custom"],
    "30d",
  ),
  from: isDate(raw.from) ? raw.from : addDays(TODAY, -30),
  to: isDate(raw.to) ? raw.to : TODAY,
  granularity: pick<Granularity>(
    raw.granularity,
    ["day", "week", "month"],
    "week",
  ),
  cohort: pick<Cohort>(
    raw.cohort,
    ["all", "enterprise", "business", "printShop"],
    "all",
  ),
});

/** Turns a range choice into concrete dates. A custom range is put in order and kept to a year. */
export const resolveRange = (
  q: Pick<AnalyticsQuery, "range" | "from" | "to">,
) => {
  let from: string;
  let to: string = TODAY;
  switch (q.range) {
    case "today":
      from = TODAY;
      break;
    case "7d":
      from = addDays(TODAY, -6);
      break;
    case "30d":
      from = addDays(TODAY, -30);
      break;
    case "quarter":
      from = "2026-07-01";
      to = "2026-09-30";
      break;
    case "ytd":
      from = "2026-01-01";
      break;
    default: {
      [from, to] = q.from <= q.to ? [q.from, q.to] : [q.to, q.from];
      if (to > TODAY) to = TODAY;
      if (from > to) from = to;
      if (daysBetween(from, to) > 366) from = addDays(to, -365);
    }
  }
  const days = daysBetween(from, to);
  return {
    from,
    to,
    days,
    prevFrom: addDays(from, -days),
    prevTo: addDays(from, -1),
  };
};

const COHORT_SHARE: Record<Cohort, number> = {
  all: 1,
  enterprise: 0.48,
  business: 0.34,
  printShop: 0.18,
};
const COHORT_AOV: Record<Cohort, number> = {
  all: 1,
  enterprise: 1.9,
  business: 0.8,
  printShop: 0.55,
};

const DAILY_BASE = 128_000;
const AOV = 2086.13;

const round2 = (n: number) => Math.round(n * 100) / 100;

const buildSeries = (
  days: number,
  from: string,
  granularity: EffectiveGranularity,
  factor: number,
): TimePoint[] => {
  const n =
    granularity === "hour"
      ? 24
      : granularity === "day"
        ? days
        : granularity === "week"
          ? Math.ceil(days / 7)
          : Math.ceil(days / 30.4);
  const perPoint = granularity === "hour" ? 1 / 24 : days / n;

  const revenue: number[] = [];
  const prior: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 1;
    const wave = 1 + 0.12 * Math.sin(i * 1.1) + 0.06 * Math.sin(i * 0.4);
    // Over a day, trade peaks in the middle of the working day.
    const shape =
      granularity === "hour"
        ? 0.35 + 1.3 * Math.max(0, Math.sin(((i - 6) / 14) * Math.PI))
        : 1;
    revenue.push(
      DAILY_BASE * factor * perPoint * (0.82 + 0.34 * t) * wave * shape,
    );
    prior.push(
      DAILY_BASE *
      factor *
      perPoint *
      (0.72 + 0.3 * t) *
      (1 + 0.1 * Math.sin(i * 0.9 + 1)) *
      shape,
    );
  }

  return revenue.map((r, i) => {
    const start =
      granularity === "hour"
        ? `${from}T${String(i).padStart(2, "0")}:00`
        : iso(ts(from) + Math.round(i * perPoint) * DAY);
    return {
      at: start,
      revenue: Math.round(r),
      prior: Math.round(prior[i]!),
      // Cash is collected after invoicing, so it trails the revenue curve.
      collected: Math.round(0.9 * (i ? revenue[i - 1]! : r * 0.9)),
      margin: Math.round(r * 0.384),
    };
  });
};

const CATEGORY_ROWS: {
  category: ProductCategory;
  share: number;
  yoy: number;
  margin: number;
}[] = [
    { category: "copiers", share: 46.5, yoy: 18.2, margin: 27.4 },
    { category: "printers", share: 33.1, yoy: 14.8, margin: 29.8 },
    { category: "inks-toner", share: 20.4, yoy: 24.6, margin: 44.6 },
  ];

const REGIONS: { key: RegionRow["key"]; share: number }[] = [
  { key: "cairo", share: 36.9 },
  { key: "delta", share: 30.7 },
  { key: "gulf", share: 16.6 },
  { key: "levant", share: 15.8 },
];

export const buildAnalytics = (query: AnalyticsQuery): AnalyticsResponse => {
  const period = resolveRange(query);
  const factor = COHORT_SHARE[query.cohort];

  // One day is shown by the hour; very long ranges are made coarser so the chart stays readable.
  let granularity: EffectiveGranularity =
    period.days === 1 ? "hour" : query.granularity;
  if (granularity === "day" && period.days > 62) granularity = "week";
  if (granularity === "week" && Math.ceil(period.days / 7) > 62)
    granularity = "month";

  const series = buildSeries(period.days, period.from, granularity, factor);
  const turnover = series.reduce((s, p) => s + p.revenue, 0);
  const priorTotal = series.reduce((s, p) => s + p.prior, 0);
  const peakIndex = series.reduce(
    (best, p, i) => (p.revenue > series[best]!.revenue ? i : best),
    0,
  );

  const aov = round2(AOV * COHORT_AOV[query.cohort]);
  const orders = Math.max(1, Math.round(turnover / aov));
  const sessions = Math.round(orders / 0.0342);

  // A short line for the first card: the series squeezed into twelve steps.
  const trend = Array.from({ length: 12 }, (_, k) => {
    const lo = Math.floor((k * series.length) / 12);
    const hi = Math.max(lo + 1, Math.floor(((k + 1) * series.length) / 12));
    const slice = series.slice(lo, hi);
    return slice.reduce((s, p) => s + p.revenue, 0) / slice.length;
  });

  const counts = [
    sessions,
    Math.round(sessions * 0.449),
    Math.round(sessions * 0.0894),
    Math.round(sessions * 0.0392),
    orders,
  ];
  const keys: FunnelStage["key"][] = [
    "sessions",
    "inspections",
    "carts",
    "wire",
    "dispatched",
  ];
  const stages: FunnelStage[] = counts.map((count, i) => ({
    key: keys[i]!,
    count,
    pct: round2((count / sessions) * 100),
    drop: i ? round2((1 - count / counts[i - 1]!) * 100) : null,
  }));

  const categories: CategoryRow[] = CATEGORY_ROWS.map((r) => ({
    ...r,
    revenue: Math.round((turnover * r.share) / 100),
  }));

  // Cohort tiles always show the whole book, whichever cohort the filter has chosen.
  const allOrders = Math.round(orders / factor);
  const cohorts = [
    {
      key: "enterprise" as const,
      share: 48,
      yoy: 31,
      orders: Math.round(allOrders * 0.48),
    },
    {
      key: "business" as const,
      share: 34,
      yoy: 12,
      orders: Math.round(allOrders * 0.34),
    },
    {
      key: "printShop" as const,
      share: 18,
      yoy: 6,
      orders: Math.round(allOrders * 0.18),
    },
  ];

  return {
    query,
    period,
    granularity,
    kpis: {
      turnover,
      turnoverDelta: round2((turnover / priorTotal - 1) * 100),
      turnoverChange: turnover - priorTotal,
      orders,
      ordersDelta: 8.4,
      inProgress: Math.max(0, Math.round(orders * 0.0065)),
      aov,
      aovDelta: 9.1,
      conversion: 3.42,
      conversionDelta: 0.48,
      sessions,
      intake: Math.round((186 * period.days * factor) / 31),
      intakeDelta: 24.1,
      trend,
    },
    series,
    peakIndex,
    funnel: {
      stages,
      conversion: round2((orders / sessions) * 100),
      velocityHours: 14.2,
    },
    categories,
    portfolioMargin: round2(
      CATEGORY_ROWS.reduce((s, r) => s + (r.share * r.margin) / 100, 0),
    ),
    cohorts,
    regions: REGIONS.map((r) => ({
      key: r.key,
      share: r.share,
      revenue: Math.round((turnover * r.share) / 100),
      orders: Math.round((orders * r.share) / 100),
    })),
    accounts: 42,
    onTimePct: 99.8,
  };
};

// --- Best-selling products ---

// Units dispatched in a 31-day month for the first products; the rest follow a fixed pattern.
const SEED_UNITS: Record<string, number> = {
  "p-0": 84,
  "p-1": 31,
  "p-2": 46,
  "p-3": 640,
  "p-4": 18,
  "p-5": 380,
  "p-6": 22,
  "p-7": 210,
};
const SEED_MARGIN: Record<string, number> = {
  "p-0": 33.9,
  "p-2": 29.8,
  "p-4": 41.5,
  "p-3": 54.2,
  "p-5": 48.6,
};
// Days of cover that inbound consignments add on top of what is on the shelf.
const SEED_INBOUND: Record<string, number> = { "p-0": 12, "p-2": 27, "p-4": 8, "p-3": 41, "p-5": 21 };
const INBOUND_PATTERN = [14, 28, 8, 42, 21];
const BASE_MARGIN: Record<ProductCategory, number> = {
  printers: 30,
  copiers: 27,
  "inks-toner": 46,
};

const statusOf = (daysLeft: number): VelocityStatus =>
  daysLeft <= 10
    ? "restock"
    : daysLeft <= 20
      ? "low"
      : daysLeft <= 35
        ? "optimal"
        : "healthy";

export const parseTopQuery = (raw: Record<string, unknown>): TopQuery => {
  const base = parseAnalyticsQuery(raw);
  const page = Number.parseInt(String(raw.page), 10);
  return {
    q: typeof raw.q === "string" ? raw.q.trim().slice(0, 80) : "",
    category: pick(
      raw.category,
      [
        "all",
        "printers",
        "copiers",
        "inks-toner",
      ] as const,
      "all",
    ),
    page: Number.isFinite(page) ? Math.min(100_000, Math.max(1, page)) : 1,
    perPage: Number(pick(String(raw.perPage), ["5", "10", "25"] as const, "5")),
    range: base.range,
    from: base.from,
    to: base.to,
  };
};

export const queryTopProducts = (query: TopQuery): TopProductsResponse => {
  const { days } = resolveRange(query);
  const needle = query.q.toLowerCase();

  const ranked = allProducts()
    .filter(
      (p) =>
        (query.category === "all" || p.category === query.category) &&
        (!needle ||
          [p.name, p.sku, p.spec].join(" ").toLowerCase().includes(needle)),
    )
    .map((p) => {
      const n = Number(p.id.slice(2)) || 0;
      const monthUnits = SEED_UNITS[p.id] ?? 1 + ((n * 13) % 40);
      const units = Math.max(1, Math.round((monthUnits * days) / 31));
      const perDay = units / days;
      // Buffer = shelf stock plus the consignments on their way.
      const inbound = SEED_INBOUND[p.id] ?? INBOUND_PATTERN[n % INBOUND_PATTERN.length]!;
      const daysLeft = Math.floor(p.stock / perDay) + inbound;
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        spec: p.spec,
        icon: p.icon,
        category: p.category,
        units,
        revenue: Math.round(units * p.price),
        margin:
          SEED_MARGIN[p.id] ??
          Math.round((BASE_MARGIN[p.category] + (n % 7) * 0.4) * 10) / 10,
        daysLeft,
        perDay: Math.round(perDay * 10) / 10,
        status: statusOf(daysLeft),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const pageCount = Math.max(1, Math.ceil(ranked.length / query.perPage));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * query.perPage;
  const rows: TopProductRow[] = ranked
    .slice(start, start + query.perPage)
    .map((r, i) => ({ ...r, rank: start + i + 1 }));

  return {
    rows,
    total: ranked.length,
    totalUnits: rows.reduce((s, r) => s + r.units, 0),
    totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
  };
};

export const categoryLabel = (c: ProductCategory) => categoryMeta[c].label;
