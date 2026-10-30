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

/** The book has a fixed "today" so states and expiry are stable between reloads. */
const TODAY = "2026-10-31";
const DAY = 86_400_000;
const addDays = (days: number) => new Date(Date.parse(TODAY) + days * DAY).toISOString().slice(0, 10);

type Seed = Omit<Coupon, "id" | "updatedAt" | "status"> & { status?: CouponStatus };

const seeds: Seed[] = [
  { code: "TONER-BULK10", campaign: "Toner Bulk Saver", description: "10% off ink and toner when you buy three or more of the same item.", type: "percentage", value: 10, cap: 1500, limit: 200, used: 142, perAccount: 3, minOrder: 1000, tier: "all", categories: ["inks-toner"], startsAt: addDays(-40), endsAt: addDays(55) },
  { code: "FREE-DELIVERY-A3", campaign: "Free Delivery on A3 Machines", description: "Free insured delivery and installation on A3 photocopiers.", type: "freight", value: 320, cap: null, limit: 500, used: 480, perAccount: 0, minOrder: 1200, tier: "all", categories: ["copiers"], startsAt: addDays(-90), endsAt: addDays(1) },
  { code: "PRINTER-SETUP-250", campaign: "Printer Setup Credit", description: "Service credit for on-site setup of large-format printers.", type: "serviceCredit", value: 250, cap: null, limit: 100, used: 64, perAccount: 1, minOrder: 3500, tier: "all", categories: ["printers"], startsAt: addDays(-30), endsAt: addDays(90) },
  { code: "BUSINESS-2026", campaign: "Business Account Bulk Procurement", description: "20% rebate for schools and offices ordering in bulk.", type: "percentage", value: 20, cap: 4000, limit: 50, used: 28, perAccount: 5, minOrder: 10000, tier: "AAA", categories: [], startsAt: addDays(-120), endsAt: addDays(200) },
  { code: "WELCOME-INK", campaign: "Welcome Ink Offer", description: "Welcome credit on the first ink order for new customers.", type: "fixed", value: 50, cap: null, limit: 1000, used: 820, perAccount: 1, minOrder: 300, tier: "all", categories: ["inks-toner"], startsAt: addDays(-200), endsAt: null },
  { code: "COPIER-TRADE-IN", campaign: "Trade-In Upgrade Bonus", description: "Extra credit when you trade in an old photocopier.", type: "fixed", value: 1200, cap: null, limit: 12, used: 12, perAccount: 1, minOrder: 12000, tier: "all", categories: ["copiers"], startsAt: addDays(-150), endsAt: addDays(30) },
  { code: "EXPO-CAIRO-26", campaign: "Cairo Office Expo Voucher", description: "Voucher for visitors of the Cairo office technology expo.", type: "percentage", value: 10, cap: 500, limit: 250, used: 0, perAccount: 1, minOrder: 800, tier: "all", categories: [], startsAt: addDays(10), endsAt: addDays(25) },
];

const WORDS = ["PRINTER", "TONER", "INK", "COPIER", "OFFICE", "SCHOOL", "BULK", "SETUP", "PRINT", "SERVICE", "DELIVERY", "SUPPLIES"];
const THEMES = ["Autumn Toner Saver", "Spring Printer Clearance", "School Supplies Rebate", "Office Onboarding Credit", "Winter Copier Offer", "Reseller Loyalty Reward", "Ink Refill Incentive"];
const CATS: ProductCategory[][] = [["printers"], ["copiers"], ["inks-toner"], ["printers", "inks-toner"], ["copiers", "inks-toner"], ["printers", "copiers"], []];
const TYPES: CouponType[] = ["percentage", "fixed", "freight", "serviceCredit"];

// How the 21 generated coupons are spread: scheduled, depleted, expired, draft, paused, active.
const PLAN: ("scheduled" | "depleted" | "expired" | "draft" | "paused" | "active")[] = [
  "scheduled", "depleted", "depleted", "expired", "expired", "expired", "draft", "draft", "paused",
  "active", "active", "active", "active", "active", "active", "active", "active", "active", "active", "active", "active",
];

const generated: Seed[] = PLAN.map((plan, k) => {
  const type = TYPES[k % TYPES.length]!;
  const limit = [25, 50, 100, 250, 500][k % 5]!;
  const base: Seed = {
    code: `${WORDS[k % WORDS.length]}-${String(10 + k * 3).padStart(2, "0")}`,
    campaign: `${THEMES[k % THEMES.length]!}`,
    description: `Offer for ${CATS[k % CATS.length]!.length ? "selected categories" : "all categories"}.`,
    type,
    value: type === "percentage" ? [5, 10, 12, 15, 20][k % 5]! : [50, 100, 150, 250, 320][k % 5]!,
    cap: type === "percentage" ? [500, 1000, 2000][k % 3]! : null,
    limit,
    used: Math.floor(limit * (0.15 + ((k * 7) % 60) / 100)),
    perAccount: [1, 3, 0][k % 3]!,
    minOrder: [300, 800, 1500, 3000, 5000][k % 5]!,
    tier: k % 7 === 0 ? "AAA" : k % 7 === 3 ? "AA" : "all",
    categories: CATS[k % CATS.length]!,
    startsAt: addDays(-60 - k),
    endsAt: addDays(30 + k * 6),
  };
  switch (plan) {
    case "scheduled": return { ...base, used: 0, startsAt: addDays(7), endsAt: addDays(60) };
    case "depleted": return { ...base, used: limit };
    case "expired": return { ...base, endsAt: addDays(-5 - k), used: Math.floor(limit * 0.6) };
    case "draft": return { ...base, used: 0, startsAt: null, endsAt: null, status: "draft" };
    case "paused": return { ...base, status: "paused" };
    default: return k === 9 || k === 10 ? { ...base, endsAt: addDays(k === 9 ? 1 : 2) } : base;
  }
});

const store = persistentList<Coupon>("coupons", () => [...seeds, ...generated].map((s, i) => ({
  ...s,
  id: `cp-${i}`,
  // 0 in the seed data means no per-account limit.
  perAccount: s.perAccount ? s.perAccount : null,
  status: s.status ?? "active",
  updatedAt: new Date(Date.parse(TODAY) - (i * 7 + 3) * 3_600_000 * 6).toISOString(),
})));

const seq = persistentValue("coupons.seq", () => store.length);
const clock = persistentValue("coupons.clock", () => 0);

// --- State: what a visitor sees, worked out from the settings and the dates ---

export const stateOf = (c: Coupon): CouponState => {
  if (c.status === "draft") return "draft";
  if (c.status === "archived") return "expired";
  if (c.endsAt && c.endsAt < TODAY) return "expired";
  if (c.startsAt && c.startsAt > TODAY) return "scheduled";
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

const stamp = () => new Date(Date.parse(TODAY) + DAY + ++clock.value * 60_000).toISOString();

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
