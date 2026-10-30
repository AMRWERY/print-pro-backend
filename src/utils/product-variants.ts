import type { ProductVariant, VariantAxis } from "~/types/admin/products";

/**
 * Builds the variant matrix: one row for every combination of axis values. Rows that already
 * exist (same combination) keep their price, stock and status, so editing an axis never wipes
 * work that was already typed in.
 */
export const buildVariants = (
  axes: VariantAxis[],
  basePrice: number,
  previous: ProductVariant[] = [],
): ProductVariant[] => {
  const live = axes.filter((a) => a.name.trim() && a.values.length);
  if (!live.length) return [];

  const combos = live.reduce<string[][]>(
    (acc, axis) => acc.flatMap((combo) => axis.values.map((v) => [...combo, v])),
    [[]],
  );

  return combos.map((values) => {
    const key = values.join("|");
    const old = previous.find((v) => v.key === key);
    return (
      old ?? {
        key,
        label: values.join(" / "),
        skuExt: values.map((v) => v.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase()).join("-"),
        price: basePrice,
        stock: 0,
        status: "active",
      }
    );
  });
};
