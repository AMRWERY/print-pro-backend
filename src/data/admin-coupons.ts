import type {
  Coupon,
  CouponBulkAction,
  CouponInput,
  CouponQuery,
  CouponRow,
  CouponSort,
  CouponState,
  CouponStatus,
  CouponTab,
  CouponTier,
  CouponType,
  CouponsResponse,
} from "~/types/admin/coupons";
import { persistentList, persistentValue } from "~/db/persist";
import type { ProductCategory } from "~/types/admin/products";

// Demo coupon book. When the app has a backend this file goes away and
// server/api/admin/coupons/* proxies the real service.

const today = () => new Date().toISOString().slice(0, 10);
const DAY = 86_400_000;
const addDays = (days: number) => new Date(Date.parse(today()) + days * DAY).toISOString().slice(0, 10);

const store = persistentList<Coupon>("coupons", () => []);

const seq = persistentValue("coupons.seq", () => store.length);
const clock = persistentValue("coupons.clock", () => 0);

// --- State: what a visitor sees, worked out from the settings and the dates ---

export const stateOf = (c: Coupon): CouponState => {
  if (c.status === "draft") return "draft";
  if (c.status === "archived") return "expired";
  if (c.endsAt && c.endsAt < today()) return "expired";
  if (c.startsAt && c.startsAt > today()) return "scheduled";
  if (c.limit !== null && c.used >= c.limit) return "depleted";
  if (c.status === "paused") return "paused";
  return "active";
};

const toRow = (c: Coupon): CouponRow => ({ ...c, state: stateOf(c) });

/** Rough value of one redemption, used for the discount KPI. */
const concession = (c: Coupon) =>
  c.type === "percentage" ? Math.min(c.cap ?? Infinity, ((Math.max(c.minOrder, 3000) * c.value) / 100)) : c.value;

// --- Query ---

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

export const parseCouponQuery = (raw: Record<string, unknown>): CouponQuery => {
  const page = Number.parseInt(String(raw.page), 10);
  return {
    q: typeof raw.q === "string" ? raw.q.trim().slice(0, 80) : "",
    tab: pick<CouponTab>(raw.tab, ["all", "active", "scheduled", "depleted", "expired", "draft"], "all"),
    type: pick(raw.type, ["all", "percentage", "fixed", "freight", "serviceCredit"] as const, "all"),
    tier: pick<CouponTier>(raw.tier, ["all", "AAA", "AA", "A"], "all"),
    sort: pick<CouponSort>(raw.sort, ["recent", "expiry", "usage", "code"], "recent"),
    page: Number.isFinite(page) ? Math.min(100_000, Math.max(1, page)) : 1,
    perPage: Number(pick(String(raw.perPage), ["10", "25", "50"] as const, "10")),
  };
};

export const queryCoupons = (query: CouponQuery): CouponsResponse => {
  const needle = query.q.toLowerCase();
  const rows = store.map(toRow);

  // Tab counts follow search, type and tier, but not the tab itself.
  const base = rows.filter(
    (c) =>
      (!needle || [c.code, c.campaign, c.description].join(" ").toLowerCase().includes(needle)) &&
      (query.type === "all" || c.type === query.type) &&
      (query.tier === "all" || c.tier === query.tier),
  );
  const counts: Record<CouponTab, number> = {
    all: base.length,
    active: base.filter((c) => c.state === "active").length,
    scheduled: base.filter((c) => c.state === "scheduled").length,
    depleted: base.filter((c) => c.state === "depleted").length,
    expired: base.filter((c) => c.state === "expired").length,
    draft: base.filter((c) => c.state === "draft").length,
  };

  const filtered = query.tab === "all" ? base : base.filter((c) => c.state === query.tab);
  const order: Record<CouponSort, (a: CouponRow, b: CouponRow) => number> = {
    recent: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    expiry: (a, b) => (a.endsAt ?? "9999").localeCompare(b.endsAt ?? "9999"),
    usage: (a, b) => (b.limit ? b.used / b.limit : 0) - (a.limit ? a.used / a.limit : 0),
    code: (a, b) => a.code.localeCompare(b.code),
  };
  const sorted = [...filtered].sort(order[query.sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / query.perPage));
  const page = Math.min(query.page, pageCount);

  const active = rows.filter((c) => c.state === "active");
  const finite = active.filter((c) => c.limit !== null);
  const capTotal = rows.reduce((s, c) => s + (c.limit ?? 0), 0);
  const redemptions = rows.reduce((s, c) => s + c.used, 0);
  const depleted = rows.filter((c) => c.state === "depleted").length;
  const expiringSoon = active.filter((c) => c.endsAt && c.endsAt <= addDays(2)).length;

  return {
    rows: sorted.slice((page - 1) * query.perPage, page * query.perPage),
    total: sorted.length,
    counts,
    kpis: {
      discountValue: Math.round(store.reduce((s, c) => s + c.used * concession(c), 0)),
      redemptions,
      active: active.length,
      singleUse: active.filter((c) => c.perAccount === 1).length,
      tiered: active.filter((c) => c.perAccount !== 1).length,
      allocatedPct: finite.length ? (finite.reduce((s, c) => s + c.used, 0) / finite.reduce((s, c) => s + (c.limit ?? 0), 0)) * 100 : 0,
      capTotal,
      capPct: capTotal ? (redemptions / capTotal) * 100 : 0,
      alerts: depleted + expiringSoon,
      depleted,
      expiringSoon,
    },
  };
};

// --- Changes ---

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const numOrNull = (v: unknown, max = 10_000_000) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
};
const dateOrNull = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export const validateCoupon = (body: unknown): CouponInput | null => {
  const b = (body ?? {}) as Record<string, unknown>;
  const code = str(b.code, 40).toUpperCase().replace(/\s+/g, "-");
  const campaign = str(b.campaign, 120);
  const type = pick<CouponType>(b.type, ["percentage", "fixed", "freight", "serviceCredit"], "percentage");
  const value = numOrNull(b.value);
  const startsAt = dateOrNull(b.startsAt);
  const endsAt = dateOrNull(b.endsAt);
  if (!/^[A-Z0-9][A-Z0-9-]{2,39}$/.test(code) || campaign.length < 2 || value === null) return null;
  if (type === "percentage" && (value <= 0 || value > 100)) return null;
  if (type !== "percentage" && value <= 0) return null;
  if (startsAt && endsAt && endsAt < startsAt) return null;
  const limit = numOrNull(b.limit, 10_000_000);
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) return null;
  const perAccount = numOrNull(b.perAccount, 1000);
  const categories = (Array.isArray(b.categories) ? b.categories : [])
    .filter((c): c is ProductCategory => ["printers", "copiers", "inks-toner"].includes(c as string))
    .slice(0, 6);
  return {
    code,
    campaign,
    description: str(b.description, 300),
    type,
    value,
    cap: type === "percentage" ? numOrNull(b.cap) : null,
    limit,
    perAccount: perAccount ? Math.round(perAccount) : null,
    minOrder: numOrNull(b.minOrder) ?? 0,
    tier: pick<CouponTier>(b.tier, ["all", "AAA", "AA", "A"], "all"),
    categories: [...new Set(categories)],
    startsAt,
    endsAt,
    status: pick<CouponStatus>(b.status, ["active", "paused", "draft", "archived"], "active"),
  };
};

export const codeTaken = (code: string, exceptId?: string) => store.some((c) => c.code === code && c.id !== exceptId);

const stamp = () => new Date(Date.now() + ++clock.value).toISOString();

export const createCoupon = (input: CouponInput): CouponRow => {
  const coupon: Coupon = { ...input, id: `cp-${seq.value++}`, used: 0, updatedAt: stamp() };
  store.unshift(coupon);
  return toRow(coupon);
};

export const updateCoupon = (id: string, input: CouponInput): CouponRow | null => {
  const coupon = store.find((c) => c.id === id);
  if (!coupon) return null;
  Object.assign(coupon, input, { updatedAt: stamp() });
  return toRow(coupon);
};

export const findCoupon = (id: string) => store.find((c) => c.id === id);

/** Pause, resume, archive or delete several coupons. Returns how many changed. */
export const bulkCoupons = (ids: string[], action: CouponBulkAction): number => {
  const chosen = store.filter((c) => ids.includes(c.id));
  if (action === "delete") {
    for (const c of chosen) store.splice(store.indexOf(c), 1);
    return chosen.length;
  }
  const next: Record<Exclude<CouponBulkAction, "delete">, CouponStatus> = { pause: "paused", resume: "active", archive: "archived" };
  let changed = 0;
  for (const c of chosen) {
    // Only live coupons can be paused; drafts and archived ones stay as they are.
    if (action === "pause" && c.status !== "active") continue;
    if (action === "resume" && c.status !== "paused") continue;
    c.status = next[action];
    c.updatedAt = stamp();
    changed++;
  }
  return changed;
};

export const isBulkAction = (v: unknown): v is CouponBulkAction =>
  v === "pause" || v === "resume" || v === "archive" || v === "delete";

/** A coupon a customer can use right now, found by the code they typed. */
export const redeemableCoupon = (code: string): Coupon | undefined => {
  const c = code.trim().toUpperCase();
  return store.find((x) => x.code.toUpperCase() === c && stateOf(x) === "active");
};

/** Counts one use of a coupon against its redemption limit. */
export const markCouponUsed = (id: string) => {
  const c = store.find((x) => x.id === id);
  if (c) c.used += 1;
};
