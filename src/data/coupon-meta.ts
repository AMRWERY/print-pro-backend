import type { Tone } from "~/types/shared/VStatusBadge";
import type { CouponSort, CouponState, CouponStatus, CouponTab, CouponTier, CouponType } from "~/types/admin/coupons";

// Labels and tones for the coupons screen (no Tailwind classes, see order-meta.ts).

export const typeMeta: Record<CouponType, { label: string; short: string; icon: string }> = {
  percentage: { label: "Percentage (%)", short: "Percentage", icon: "lucide:percent" },
  fixed: { label: "Fixed subtotal", short: "Fixed amount", icon: "lucide:banknote" },
  freight: { label: "Free delivery", short: "Delivery", icon: "lucide:truck" },
  serviceCredit: { label: "Service credit", short: "Service credit", icon: "lucide:printer" },
};

export const typeOptions: { value: "all" | CouponType; label: string }[] = [
  { value: "all", label: "Type: all offers" },
  ...(Object.keys(typeMeta) as CouponType[]).map((value) => ({ value, label: typeMeta[value].label })),
];

export const stateMeta: Record<CouponState, { label: string; tone: Tone; icon: string }> = {
  active: { label: "Active", tone: "success", icon: "lucide:circle-check" },
  scheduled: { label: "Scheduled", tone: "info", icon: "lucide:calendar-clock" },
  depleted: { label: "Exhausted", tone: "accent", icon: "lucide:circle-alert" },
  expired: { label: "Expired", tone: "neutral", icon: "lucide:clock" },
  paused: { label: "Paused", tone: "warning", icon: "lucide:pause" },
  draft: { label: "Draft", tone: "neutral", icon: "lucide:file-text" },
};

export const tabs: { value: CouponTab; label: string }[] = [
  { value: "all", label: "All vouchers" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "depleted", label: "Depleted" },
  { value: "expired", label: "Expired / archived" },
  { value: "draft", label: "Drafts" },
];

export const tierOptions: { value: CouponTier; label: string }[] = [
  { value: "all", label: "Tier: all customers" },
  { value: "AAA", label: "AAA key accounts only" },
  { value: "AA", label: "AA preferred only" },
  { value: "A", label: "A standard only" },
];

export const sortOptions: { value: CouponSort; label: string }[] = [
  { value: "recent", label: "Recently modified" },
  { value: "expiry", label: "Expiry (soonest)" },
  { value: "usage", label: "Usage (highest)" },
  { value: "code", label: "Code (A to Z)" },
];

export const statusOptions: { value: CouponStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

export const perAccountOptions = [
  { value: 1, label: "1 claim per account" },
  { value: 3, label: "3 claims per account" },
  { value: 5, label: "5 claims per account" },
  { value: 0, label: "Unlimited per account" },
];

/** Short text for the discount column, for example "15% OFF". */
export const valueLabel = (
  c: { type: CouponType; value: number },
  money: (n: number) => string,
) => (c.type === "percentage" ? `${c.value}% OFF` : c.type === "freight" ? "FREE FREIGHT" : `${money(c.value)} FLAT`);
