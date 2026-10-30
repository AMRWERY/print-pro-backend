export type CategoryVisibility = "active" | "staging" | "hidden";

export type CategorySort = "curated" | "newest" | "priceAsc" | "priceDesc";

export interface Category {
  id: string;
  /** Catalog code such as CAT-CAM-01. */
  code: string;
  name: string;
  /** URL path, for example /printers/laser. */
  slug: string;
  /** null for a master (top-level) category. */
  parentId: string | null;
  /** Position among its siblings, starting at 0. */
  order: number;
  skus: number;
  visibility: CategoryVisibility;
  abstract: string;
  icon: string;
  megamenu: boolean;
  publicIndexing: boolean;
  /** Filter facet priority, 1 (highest) to 5. */
  facetRank: number;
  defaultSort: CategorySort;
}

export interface CategoriesResponse {
  nodes: Category[];
  kpis: {
    masters: number;
    children: number;
    skus: number;
    unpublished: number;
  };
}

export interface CategoryInput {
  name: string;
  slug: string;
  parentId: string | null;
  visibility: CategoryVisibility;
  abstract: string;
  megamenu: boolean;
  publicIndexing: boolean;
  facetRank: number;
  defaultSort: CategorySort;
}
