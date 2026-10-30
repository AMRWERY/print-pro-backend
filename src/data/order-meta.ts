import type {
  AccountTier,
  OrderPriority,
  OrderRange,
  OrderSort,
  OrderStage,
  PaymentState,
} from "~/types/admin/orders";
import type { Tone } from "~/types/shared/VStatusBadge";

// Labels, tones and icons for the orders screen. Tones are VStatusBadge props, so no
// Tailwind classes live here. Every status is a word + icon + colour (design.md §22).

export const stageMeta: Record<
  OrderStage,
  { tab: string; status: string; statusTone: Tone; statusIcon: string; payment: string; paymentTone: Tone; paymentIcon: string }
> = {
  awaitingPayment: {
    tab: "Awaiting payment",
    status: "On hold for payment",
    statusTone: "warning",
    statusIcon: "lucide:lock",
    payment: "Awaiting transfer",
    paymentTone: "neutral",
    paymentIcon: "lucide:clock",
  },
  checking: {
    tab: "Checking & testing",
    status: "Being tested",
    statusTone: "warning",
    statusIcon: "lucide:flask-conical",
    payment: "Paid · held for tests",
    paymentTone: "accent",
    paymentIcon: "lucide:shield-alert",
  },
  packing: {
    tab: "Packing",
    status: "Packing",
    statusTone: "warning",
    statusIcon: "lucide:package",
    payment: "Paid",
    paymentTone: "warning",
    paymentIcon: "lucide:landmark",
  },
  inTransit: {
    tab: "On the way",
    status: "With the courier",
    statusTone: "info",
    statusIcon: "lucide:truck",
    payment: "Paid",
    paymentTone: "warning",
    paymentIcon: "lucide:landmark",
  },
  completed: {
    tab: "Completed & delivered",
    status: "Delivered",
    statusTone: "success",
    statusIcon: "lucide:shield-check",
    payment: "Settled",
    paymentTone: "success",
    paymentIcon: "lucide:shield-check",
  },
};

export const stageOptions = (Object.keys(stageMeta) as OrderStage[]).map((value) => ({
  value,
  label: stageMeta[value].tab,
}));

export const paymentOptions: { value: "all" | PaymentState; label: string }[] = [
  { value: "all", label: "All payment states" },
  { value: "awaitingTransfer", label: "Awaiting transfer" },
  { value: "paid", label: "Paid" },
  { value: "onHold", label: "On hold" },
  { value: "settled", label: "Settled" },
];

export const tierMeta: Record<AccountTier, { label: string; tone: Tone }> = {
  enterprise: { label: "Enterprise", tone: "warning" },
  business: { label: "Business", tone: "info" },
  printShop: { label: "Print shop & reseller", tone: "neutral" },
  home: { label: "Home & small office", tone: "neutral" },
};

export const tierOptions: { value: "all" | AccountTier; label: string }[] = [
  { value: "all", label: "All account types" },
  ...(Object.keys(tierMeta) as AccountTier[]).map((value) => ({
    value,
    label: tierMeta[value].label,
  })),
];

export const priorityMeta: Record<OrderPriority, { label: string; tone: Tone }> = {
  urgent: { label: "Urgent", tone: "accent" },
  bulk: { label: "Bulk", tone: "neutral" },
  installation: { label: "Installation", tone: "neutral" },
  service: { label: "Service", tone: "info" },
  hold: { label: "Hold", tone: "warning" },
  standard: { label: "Standard", tone: "neutral" },
  vip: { label: "VIP", tone: "warning" },
};

export const rangeOptions: { value: OrderRange; label: string }[] = [
  { value: "all", label: "All dates" },
  { value: "30d", label: "Last 30 days" },
  { value: "7d", label: "Last 7 days" },
];

export const sortOptions: { value: OrderSort; label: string }[] = [
  { value: "newest", label: "Order date (newest first)" },
  { value: "oldest", label: "Order date (oldest first)" },
  { value: "high", label: "Order value (high to low)" },
  { value: "low", label: "Order value (low to high)" },
];
