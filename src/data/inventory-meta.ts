import type { Tone } from "~/types/shared/VStatusBadge";
import type { InventoryFilter, InventorySort, MovementType, Warehouse } from "~/types/admin/inventory";

// Labels, tones and icons for the inventory screen (no Tailwind classes, see order-meta.ts).

export const warehouseLabel: Record<Warehouse, string> = {
  "CAI-01": "Cairo main warehouse",
  "GIZ-02": "Giza branch",
  "ALX-01": "Alexandria depot",
};

export const warehouseOptions = [
  { value: "all", label: "Warehouse: all" },
  ...(Object.keys(warehouseLabel) as Warehouse[]).map((value) => ({ value, label: warehouseLabel[value] })),
];

export const filterTabs: { value: InventoryFilter; label: string }[] = [
  { value: "all", label: "All inventory" },
  { value: "healthy", label: "Healthy stock" },
  { value: "low", label: "Low stock alerts" },
  { value: "out", label: "Out of stock" },
  { value: "hold", label: "On hold" },
];

export const sortOptions: { value: InventorySort; label: string }[] = [
  { value: "urgent", label: "Most urgent first" },
  { value: "qtyAsc", label: "Quantity (lowest first)" },
  { value: "qtyDesc", label: "Quantity (highest first)" },
  { value: "value", label: "Stock value (highest first)" },
];

export const movementMeta: Record<MovementType, { label: string; tone: Tone; icon: string }> = {
  allocation: { label: "Allocation", tone: "accent", icon: "lucide:lock" },
  inbound: { label: "Inbound", tone: "success", icon: "lucide:package-plus" },
  dispatch: { label: "Dispatch", tone: "info", icon: "lucide:truck" },
  transfer: { label: "Transfer", tone: "neutral", icon: "lucide:arrow-right-left" },
  testing: { label: "Testing", tone: "warning", icon: "lucide:flask-conical" },
  adjustment: { label: "Adjustment", tone: "neutral", icon: "lucide:sliders-horizontal" },
};
