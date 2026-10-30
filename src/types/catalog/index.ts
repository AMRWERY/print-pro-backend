import type { Product } from "~/types/home";

export type CatalogCategory = "printers" | "copiers" | "inks-toner";

export type DispatchKey =
  | "in-stock"
  | "consignment"
  | "factory-order"
  | "freight";

export type SortKey = "featured" | "price-asc" | "price-desc" | "rating";

export interface PrinterAttrs {
  technology: "inkjet" | "laser" | "large-format";
  colour: "colour" | "mono";
  maxPaper: "A4" | "A3" | "A2" | "A1" | "A0";
  connectivity: ("wifi" | "ethernet" | "usb")[];
  duplex: boolean;
}

export interface CopierAttrs {
  /** Pages per minute. */
  ppm: number;
  paper: "A4" | "A3";
  colour: "colour" | "mono";
  functions: ("copy" | "print" | "scan" | "fax")[];
  duplex: boolean;
}

export interface InkAttrs {
  kind: "ink" | "toner" | "drum";
  colour: "black" | "cyan" | "magenta" | "yellow" | "multi";
  /** Printer or copier models this supply fits. */
  compatibleWith: string[];
  /** Brands those models belong to (used by the filter). */
  compatibleBrands: string[];
  /** Page yield or volume, for display. */
  yield: string;
}

export type CatalogAttrs = PrinterAttrs | CopierAttrs | InkAttrs;

export interface CatalogProduct extends Product {
  sku: string;
  category: CatalogCategory;
  dispatch: DispatchKey;
  attrs: CatalogAttrs;
}

export interface CatalogFilters {
  query: string;
  categories: CatalogCategory[];
  brands: string[];
  priceMin: number | null;
  priceMax: number | null;
  dispatch: DispatchKey[];
  minRating: number | null;
  /** Category-specific attribute filters: attribute key -> selected values. */
  attrs: Record<string, string[]>;
}

export interface FilterChip {
  key: string;
  label: string;
  remove: () => void;
}

export interface AttrFilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}
