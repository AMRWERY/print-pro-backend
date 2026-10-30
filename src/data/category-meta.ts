import type { CategorySort, CategoryVisibility } from "~/types/admin/categories";
import type { Tone } from "~/types/shared/VStatusBadge";

export const visibilityMeta: Record<CategoryVisibility, { label: string; tone: Tone; icon: string }> = {
  active: { label: "Storefront: active", tone: "success", icon: "lucide:eye" },
  staging: { label: "Staging only", tone: "warning", icon: "lucide:flask-conical" },
  hidden: { label: "Storefront: hidden", tone: "neutral", icon: "lucide:eye-off" },
};

export const visibilityOptions = (Object.keys(visibilityMeta) as CategoryVisibility[]).map((value) => ({
  value,
  label: visibilityMeta[value].label.replace("Storefront: ", "").replace(/^./, (c) => c.toUpperCase()),
}));

export const sortOptions: { value: CategorySort; label: string }[] = [
  { value: "curated", label: "Featured (staff choice)" },
  { value: "newest", label: "Newest first" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
];

export const facetOptions = [1, 2, 3, 4, 5].map((n) => ({
  value: n,
  label: n === 1 ? "Rank 1 (highest)" : n === 5 ? "Rank 5 (lowest)" : `Rank ${n}`,
}));
