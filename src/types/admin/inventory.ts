import type {
  Product,
  ProductCategory,
  StockState,
} from "~/types/admin/products";

export type Warehouse = "CAI-01" | "GIZ-02" | "ALX-01";

export type InventoryFilter = "all" | "healthy" | "low" | "out" | "hold";

export type InventorySort = "urgent" | "qtyAsc" | "qtyDesc" | "value";

/** A product as the inventory ledger sees it: stock plus where it is kept. */
export interface InventoryItem extends Product {
  warehouse: Warehouse;
  bin: string;
  /** Units promised to open orders. */
  reserved: number;
  /** Units that can still be promised: stock minus reserved. */
  available: number;
  state: StockState;
  /** On hold: being tested, or waiting on the supplier. */
  testHold: boolean;
}

export interface InventoryQuery {
  q: string;
  category: "all" | ProductCategory;
  warehouse: "all" | Warehouse;
  filter: InventoryFilter;
  sort: InventorySort;
  page: number;
  perPage: number;
}

export interface InventoryResponse {
  rows: InventoryItem[];
  total: number;
  counts: Record<InventoryFilter, number>;
  kpis: {
    valuation: number;
    units: number;
    skus: number;
    healthyPct: number;
    low: number;
    out: number;
    /** Cost to bring every out-of-stock SKU back to its reorder point. */
    reorderValue: number;
  };
}

export type MovementType =
  | "allocation"
  | "inbound"
  | "dispatch"
  | "transfer"
  | "testing"
  | "adjustment";

export interface Movement {
  id: string;
  type: MovementType;
  /** Signed change in units; null for moves that don't change the count. */
  qty: number | null;
  sku: string;
  name: string;
  note: string;
  actor: string;
  at: string;
}

export interface AdjustInput {
  productId: string;
  mode: "delta" | "set";
  qty: number;
  reason: string;
}

export interface ReceiveInput {
  productId: string;
  qty: number;
  reference: string;
}

export interface TransferInput {
  productId: string;
  warehouse: Warehouse;
}

/** The editable record of an inventory item (add and edit share it). */
export interface ItemInput {
  name: string;
  sku: string;
  category: ProductCategory;
  brand: string;
  /** Unit value. */
  price: number;
  stock: number;
  /** Reorder point. */
  min: number;
  warehouse: Warehouse;
  bin: string;
}