export type ProductCategory = "printers" | "copiers" | "inks-toner";

/** testing = being tested before it is listed, hold = withdrawn or on hold. */
export type ProductStatus = "active" | "testing" | "hold" | "draft";

export type StockState = "ok" | "low" | "out";

/** "depleted" = low or out. */
export type StockFilter = "all" | StockState | "depleted";

export type ProductSort =
  | "newest"
  | "name"
  | "priceHigh"
  | "priceLow"
  | "stockLow";

export interface Product {
  id: string;
  sku: string;
  ean: string;
  name: string;
  tag: string;
  spec: string;
  /** "S/N: …" or "BATCH: …" line. */
  serial: string;
  category: ProductCategory;
  brand: string;
  /** Unit price in EGP. */
  price: number;
  stock: number;
  /** Reorder point: at or below this the product is low on stock. */
  min: number;
  unit: "unit" | "pack";
  status: ProductStatus;
  icon: string;
}

export interface ProductsQuery {
  q: string;
  category: "all" | ProductCategory;
  brand: string;
  stock: StockFilter;
  status: "all" | ProductStatus;
  sort: ProductSort;
  page: number;
  perPage: number;
}

export interface ProductsResponse {
  rows: Product[];
  total: number;
  brands: string[];
  kpis: {
    registered: number;
    indexedThisCycle: number;
    valuation: number;
    depleted: number;
    testing: number;
    hold: number;
  };
  presets: { a3Copiers: number; supplies: number; depleted: number };
}

export interface ProductInput {
  name: string;
  sku: string;
  category: ProductCategory;
  brand: string;
  price: number;
  stock: number;
  min: number;
  status: ProductStatus;
}

export interface Template {
  prefix: string;
  name: string;
  tag: string;
  spec: string;
  serialKind: "S/N" | "BATCH" | "LOT";
  category: ProductCategory;
  brand: string;
  price: number;
  unit: "unit" | "pack";
  min: number;
}

// ---------------------------------------------------------------------------
// Product editor (create / edit)
// ---------------------------------------------------------------------------

export type Publication = "draft" | "published" | "archived";
export type Backorder = "block" | "notify" | "allow";
export type Packaging = "pallet" | "standard";
export type VariantStatus = "active" | "preorder" | "hidden";

export interface ProductMedia {
  name: string;
  size: number;
}

export interface VariantAxis {
  name: string;
  values: string[];
}

export interface ProductVariant {
  /** Stable key: the axis values joined with "|". */
  key: string;
  label: string;
  skuExt: string;
  price: number;
  stock: number;
  status: VariantStatus;
}

export interface ProductSpec {
  key: string;
  value: string;
}

export interface ProductRevision {
  rev: string;
  at: string;
  by: string;
  note: string;
}

/** Everything the editor holds beyond the register's basic columns. */
export interface ProductExtras {
  slug: string;
  description: string;
  excerpt: string;
  media: ProductMedia[];
  compareAt: number | null;
  cost: number | null;
  taxExempt: boolean;
  backorder: Backorder;
  axes: VariantAxis[];
  variants: ProductVariant[];
  specs: ProductSpec[];
  massKg: number | null;
  dims: { l: number | null; w: number | null; h: number | null };
  hsCode: string;
  packaging: Packaging;
  seoTitle: string;
  seoDescription: string;
  publication: Publication;
  channels: string[];
  subType: string;
  collections: string[];
  tags: string[];
  bundled: string[];
}

export type ProductFormValues = ProductInput & ProductExtras;

export interface ProductDetail extends Product, ProductExtras {
  revisions: ProductRevision[];
}
