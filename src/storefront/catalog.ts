import { findProduct as findStaticProduct } from "./data/product-details";
import { allProducts as adminProducts, savedExtras } from "~/data/admin-products";
import type { Product as AdminProduct } from "~/types/admin/products";
import type { CatalogAttrs, CatalogCategory, CatalogProduct } from "~/types/catalog";
import { badges, catalogProducts } from "./data/catalog";

/**
 * The storefront catalog is the hand-written product pages (copy, specs, images) with the live
 * admin record laid over them: name, brand, price, stock and visibility all come from the admin
 * Products screen, linked by SKU. A product an admin creates in the editor and publishes to the
 * storefront channel appears here too, with category defaults for what only the storefront knows.
 */

const isListed = (p: AdminProduct) => {
  if (p.status !== "active") return false;
  const extras = savedExtras(p.id);
  if (!extras) return true;
  return extras.publication === "published" && extras.channels.includes("storefront");
};

const defaultAttrs: Record<CatalogCategory, CatalogAttrs> = {
  printers: { technology: "inkjet", colour: "colour", maxPaper: "A4", connectivity: ["usb"], duplex: false },
  copiers: { ppm: 20, paper: "A4", colour: "mono", functions: ["copy", "print", "scan"], duplex: false },
  "inks-toner": { kind: "ink", colour: "black", compatibleWith: [], compatibleBrands: [], yield: "See product page" },
};
const groupOf = { printers: "printer", copiers: "copier", "inks-toner": "ink" } as const;
const iconOf = { printers: "lucide:printer", copiers: "lucide:copy", "inks-toner": "lucide:droplets" } as const;

/** In stock keeps its "ships today" badge; a sold-out machine falls back to a special order. */
const availability = (c: CatalogProduct, stock: number): Pick<CatalogProduct, "dispatch" | "badge"> =>
  c.dispatch === "in-stock" && stock <= 0
    ? { dispatch: "factory-order", badge: badges["factory-order"] }
    : { dispatch: c.dispatch, badge: c.badge };

const fromAdmin = (a: AdminProduct): CatalogProduct => {
  const extras = savedExtras(a.id);
  const dispatch = a.stock > 0 ? "in-stock" : "factory-order";
  return {
    id: extras?.slug || a.id,
    sku: a.sku,
    category: a.category,
    dispatch,
    group: groupOf[a.category],
    badge: badges[dispatch],
    brand: a.brand,
    name: a.name,
    blurb: extras?.excerpt || a.spec,
    specs: [a.tag, a.spec, a.brand],
    rating: 0,
    reviews: 0,
    price: a.price,
    lease: 0,
    icon: iconOf[a.category],
    attrs: defaultAttrs[a.category],
  };
};

export interface CatalogEntry {
  product: CatalogProduct;
  /** Units on hand according to the admin register. */
  stock: number;
  adminId: string;
}

export const catalogEntries = (): CatalogEntry[] => {
  const bySku = new Map(adminProducts().map((p) => [p.sku, p]));
  const out: CatalogEntry[] = [];
  const linked = new Set<string>();

  for (const c of catalogProducts) {
    const a = bySku.get(c.sku);
    if (!a) {
      // Not in the admin register at all: sold as written.
      out.push({ product: c, stock: Infinity, adminId: "" });
      continue;
    }
    linked.add(a.id);
    if (!isListed(a)) continue;
    const extras = savedExtras(a.id);
    out.push({
      product: {
        ...c,
        ...availability(c, a.stock),
        name: a.name,
        brand: a.brand,
        price: a.price,
        blurb: extras?.excerpt || c.blurb,
      },
      stock: a.stock,
      adminId: a.id,
    });
  }

  // Products created in the editor and published to the storefront.
  for (const a of adminProducts()) {
    if (linked.has(a.id) || !savedExtras(a.id) || !isListed(a)) continue;
    out.push({ product: fromAdmin(a), stock: a.stock, adminId: a.id });
  }
  return out;
};

export const listCatalog = (): CatalogProduct[] => catalogEntries().map((e) => e.product);

export const findCatalogEntry = (id: string) => catalogEntries().find((e) => e.product.id === id);

const catalogIds = new Set(catalogProducts.map((p) => p.id));

/**
 * The product to show or sell for an id. Catalog products come only from the live catalog, so one an admin
 * has hidden or put on hold can't be reached by its link or ordered. Home-page and account extras that were never
 * catalog products fall back to their static record.
 */
export const findSellable = (id: string) => {
  const entry = findCatalogEntry(id);
  if (entry) return entry.product;
  return catalogIds.has(id) ? undefined : findStaticProduct(id);
};
