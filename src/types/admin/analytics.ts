import type { ProductCategory } from "~/types/admin/products";

export type AnalyticsRange =
  | "today"
  | "7d"
  | "30d"
  | "quarter"
  | "ytd"
  | "custom";

export type Granularity = "day" | "week" | "month";

/** The interval the server actually used. Today is shown by the hour. */
export type EffectiveGranularity = Granularity | "hour";

export type Cohort = "all" | "enterprise" | "business" | "printShop";

export interface AnalyticsQuery {
  range: AnalyticsRange;
  /** Custom range, YYYY-MM-DD. */
  from: string;
  to: string;
  granularity: Granularity;
  cohort: Cohort;
}

export interface TimePoint {
  /** Start of the interval, YYYY-MM-DD. */
  at: string;
  revenue: number;
  prior: number;
  collected: number;
  margin: number;
}

export interface AnalyticsKpis {
  turnover: number;
  turnoverDelta: number;
  turnoverChange: number;
  orders: number;
  ordersDelta: number;
  inProgress: number;
  aov: number;
  aovDelta: number;
  conversion: number;
  conversionDelta: number;
  sessions: number;
  intake: number;
  intakeDelta: number;
  trend: number[];
}

export interface FunnelStage {
  key: "sessions" | "inspections" | "carts" | "wire" | "dispatched";
  count: number;
  /** Share of the first stage. */
  pct: number;
  /** Lost since the stage before, as a percentage; null for the first. */
  drop: number | null;
}

export interface CategoryRow {
  category: ProductCategory;
  revenue: number;
  share: number;
  yoy: number;
  margin: number;
}

export interface CohortRow {
  key: Exclude<Cohort, "all">;
  share: number;
  yoy: number;
  orders: number;
}

export interface RegionRow {
  key: "cairo" | "delta" | "gulf" | "levant";
  orders: number;
  revenue: number;
  share: number;
}

export interface AnalyticsResponse {
  query: AnalyticsQuery;
  /** Range actually used (the server fixes impossible custom ranges). */
  period: {
    from: string;
    to: string;
    days: number;
    prevFrom: string;
    prevTo: string;
  };
  /** The interval actually used: very long ranges are made coarser. */
  granularity: EffectiveGranularity;
  kpis: AnalyticsKpis;
  series: TimePoint[];
  peakIndex: number;
  funnel: { stages: FunnelStage[]; conversion: number; velocityHours: number };
  categories: CategoryRow[];
  portfolioMargin: number;
  cohorts: CohortRow[];
  regions: RegionRow[];
  accounts: number;
  onTimePct: number;
}

export type VelocityStatus = "restock" | "low" | "optimal" | "healthy";

export interface TopProductRow {
  rank: number;
  id: string;
  name: string;
  sku: string;
  spec: string;
  icon: string;
  category: ProductCategory;
  units: number;
  revenue: number;
  margin: number;
  daysLeft: number;
  perDay: number;
  status: VelocityStatus;
}

export interface TopProductsResponse {
  rows: TopProductRow[];
  total: number;
  totalUnits: number;
  totalRevenue: number;
}

export interface TopQuery {
  q: string;
  category: "all" | ProductCategory;
  page: number;
  perPage: number;
  range: AnalyticsRange;
  from: string;
  to: string;
}
