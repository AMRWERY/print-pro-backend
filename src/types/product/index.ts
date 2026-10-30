import type { Product } from "~/types/home";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

/** Any product that can have a details page. */
export type DetailedProduct = Product & { sku?: string };

export interface GalleryItem {
  label: string;
  src?: string;
  alt?: string;
  icon?: string;
}

export interface PackageOption {
  id: string;
  label: string;
  note: string;
  /** Added to the base price. */
  delta: number;
}

export interface SpecGroup {
  title: string;
  rows: { label: string; value: string }[];
}

export interface DocumentLink {
  title: string;
  meta: string;
  icon: string;
}

export interface ReviewItem {
  author: string;
  location: string;
  badge: string;
  title: string;
  body: string;
  date: string;
}

/** A review a customer submitted from the product page. */
export interface CustomerReview {
  id: string;
  author: string;
  /** 1 to 5. */
  rating: number;
  title: string;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
}

export interface ReviewSummary {
  score: number;
  count: number;
  /** Counts for 5, 4, 3, 2, 1 stars. */
  distribution: number[];
  items: ReviewItem[];
}

export interface ProductDetail {
  subtitle: string;
  crumbs?: BreadcrumbItem[];
  compareAt?: number;
  stockLabel: string;
  leaseNote?: string;
  gallery: GalleryItem[];
  packages: PackageOption[];
  assurance: string[];
  keyFacts: { label: string; value: string }[];
  feature?: {
    eyebrow: string;
    title: string;
    body: string;
    cards: { eyebrow: string; title: string; body: string; metric: string }[];
  };
  benchmark?: {
    title: string;
    note: string;
    columns: string[];
    rows: string[][];
  };
  specGroups: SpecGroup[];
  documents: DocumentLink[];
  reviews?: ReviewSummary;
  /** Printer or copier models a supply fits (inks and toner), or supplies a machine uses. */
  compatibleWith?: string[];
  /** Short note under the compatibility list, such as how yield is measured. */
  yieldNote?: string;
  qa: { q: string; a: string }[];
  related: string[];
}