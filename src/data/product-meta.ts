import type {
  ProductCategory,
  ProductSort,
  ProductStatus,
  StockFilter,
  StockState,
} from "~/types/admin/products";
import type { Tone } from "~/types/shared/VStatusBadge";

// Labels, tones and icons for the products screen (no Tailwind classes, see order-meta.ts).

export const categoryMeta: Record<ProductCategory, { label: string; icon: string }> = {
  printers: { label: "Printers", icon: "lucide:printer" },
  copiers: { label: "Photocopiers", icon: "lucide:copy" },
  "inks-toner": { label: "Inks & Toner", icon: "lucide:droplets" },
};

export const categoryOptions: { value: "all" | ProductCategory; label: string }[] = [
  { value: "all", label: "Category: all" },
  ...(Object.keys(categoryMeta) as ProductCategory[]).map((value) => ({
    value,
    label: categoryMeta[value].label,
  })),
];

export const stockMeta: Record<StockState, { label: string; tone: Tone; icon: string }> = {
  ok: { label: "In stock", tone: "success", icon: "lucide:circle-check" },
  low: { label: "Low stock", tone: "warning", icon: "lucide:triangle-alert" },
  out: { label: "Out of stock", tone: "accent", icon: "lucide:circle-alert" },
};

export const stockOptions: { value: StockFilter; label: string }[] = [
  { value: "all", label: "Stock: all" },
  { value: "ok", label: "In stock" },
  { value: "depleted", label: "Depleted (low + out)" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];

export const statusMeta: Record<ProductStatus, { label: string; tone: Tone; icon: string }> = {
  active: { label: "Active · listed", tone: "success", icon: "lucide:shield-check" },
  testing: { label: "In testing", tone: "info", icon: "lucide:flask-conical" },
  hold: { label: "On hold", tone: "accent", icon: "lucide:shield-alert" },
  draft: { label: "Draft", tone: "neutral", icon: "lucide:file-text" },
};

export const statusOptions: { value: "all" | ProductStatus; label: string }[] = [
  { value: "all", label: "Status: all" },
  ...(Object.keys(statusMeta) as ProductStatus[]).map((value) => ({
    value,
    label: statusMeta[value].label,
  })),
];

export const sortOptions: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest registered" },
  { value: "name", label: "Name (A–Z)" },
  { value: "priceHigh", label: "Price (high to low)" },
  { value: "priceLow", label: "Price (low to high)" },
  { value: "stockLow", label: "Stock (lowest first)" },
];

export const stockStateOf = (p: { stock: number; min: number }): StockState =>
  p.stock <= 0 ? "out" : p.stock <= p.min ? "low" : "ok";
