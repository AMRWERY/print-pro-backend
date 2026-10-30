import type { Tone } from "~/types/shared/VStatusBadge";
import type {
  CustomerActivity,
  CustomerSegment,
  CustomerSort,
  CustomerStatus,
  CustomerTier,
} from "~/types/admin/customers";

// Labels and tones for the customers screen (no Tailwind classes, see order-meta.ts).

export const segmentMeta: Record<CustomerSegment, { tab: string; short: string; tone: Tone }> = {
  enterprise: { tab: "Enterprise & institutions", short: "Enterprise", tone: "info" },
  business: { tab: "Offices & schools", short: "Business", tone: "neutral" },
  printShop: { tab: "Print shops & resellers", short: "Print shop", tone: "neutral" },
  home: { tab: "Home & small office", short: "Home office", tone: "warning" },
  highLtv: { tab: "High value (over 50k)", short: "High value", tone: "success" },
};

export const segmentOptions = (Object.keys(segmentMeta) as CustomerSegment[]).map((value) => ({
  value,
  label: segmentMeta[value].tab,
}));

export const statusMeta: Record<CustomerStatus, { label: string; tone: Tone; icon: string }> = {
  active: { label: "Active", tone: "success", icon: "lucide:circle-check" },
  audit: { label: "In audit", tone: "warning", icon: "lucide:shield-alert" },
  dormant: { label: "Dormant", tone: "neutral", icon: "lucide:clock" },
};

export const statusOptions: { value: "all" | CustomerStatus; label: string }[] = [
  { value: "all", label: "Status: all" },
  ...(Object.keys(statusMeta) as CustomerStatus[]).map((value) => ({ value, label: statusMeta[value].label })),
];

export const tierMeta: Record<CustomerTier, { label: string; tone: Tone }> = {
  AAA: { label: "AAA key account", tone: "warning" },
  AA: { label: "AA preferred", tone: "info" },
  A: { label: "A standard", tone: "neutral" },
};

export const tierOptions = (Object.keys(tierMeta) as CustomerTier[]).map((value) => ({
  value,
  label: tierMeta[value].label,
}));

export const activityOptions: { value: CustomerActivity; label: string }[] = [
  { value: "all", label: "Activity: any time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export const sortOptions: { value: CustomerSort; label: string }[] = [
  { value: "spend", label: "Total spend (high to low)" },
  { value: "spendLow", label: "Total spend (low to high)" },
  { value: "name", label: "Name (A to Z)" },
  { value: "newest", label: "Newest clients" },
];

export const initialsOf = (name: string) =>
  name
    .replace(/^(dr|prof)\.?\s+/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
