import type { Tone } from "~/types/shared/VStatusBadge";
import type {
  AnalyticsRange,
  Cohort,
  FunnelStage,
  Granularity,
  RegionRow,
  VelocityStatus,
} from "~/types/admin/analytics";

// Labels and tones for the analytics screen (no Tailwind classes, see order-meta.ts).

export const rangeOptions: { value: AnalyticsRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7D" },
  { value: "30d", label: "Last 30D" },
  { value: "quarter", label: "Q3 2026" },
  { value: "ytd", label: "Year to date" },
  { value: "custom", label: "Custom range" },
];

export const granularityOptions: { value: Granularity; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

export const cohortLabel: Record<Cohort, string> = {
  all: "All customer groups",
  enterprise: "Enterprise",
  business: "Business & schools",
  printShop: "Print shops",
};

export const cohortNote: Record<Exclude<Cohort, "all">, { name: string; sub: string; yoyLabel: string }> = {
  enterprise: { name: "Enterprise", sub: "Large offices & groups", yoyLabel: "orders" },
  business: { name: "Business & schools", sub: "Offices, schools, clinics", yoyLabel: "orders" },
  printShop: { name: "Print shops", sub: "Print shops & resellers", yoyLabel: "demand" },
};

export const funnelLabel: Record<FunnelStage["key"], { title: string; hint: string }> = {
  sessions: { title: "Visits & sessions", hint: "Visitors reaching the catalog" },
  inspections: { title: "Product page views", hint: "Spec sheets and compatibility lists opened" },
  carts: { title: "Carts & quotes", hint: "Orders started or quotes requested" },
  wire: { title: "Payment confirmation", hint: "Bank transfer and card checks" },
  dispatched: { title: "Dispatched orders", hint: "Settled and shipped" },
};

export const regionLabel: Record<RegionRow["key"], { name: string; sub: string }> = {
  cairo: { name: "Greater Cairo", sub: "Cairo / Giza" },
  delta: { name: "Alexandria & Delta", sub: "ALX / MNS / TNT" },
  gulf: { name: "Gulf markets", sub: "KSA / UAE / QA" },
  levant: { name: "Levant & upper Egypt", sub: "JO / LXR / ASW" },
};

export const velocityMeta: Record<VelocityStatus, { label: string; tone: Tone; icon: string }> = {
  restock: { label: "Restock", tone: "accent", icon: "lucide:circle-alert" },
  low: { label: "Low buffer", tone: "warning", icon: "lucide:triangle-alert" },
  optimal: { label: "Optimal", tone: "info", icon: "lucide:circle-check" },
  healthy: { label: "Healthy", tone: "success", icon: "lucide:shield-check" },
};

/** Short axis and tooltip labels for one interval. */
export const pointLabel = (at: string, granularity: string) => {
  if (granularity === "hour") return `${at.slice(11, 13)}:00`;
  const d = new Date(`${at.slice(0, 10)}T00:00:00Z`);
  return granularity === "month"
    ? d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

export const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" });
