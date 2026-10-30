import type { DetailedProduct } from "~/types/product";
export interface CartEntry {
  line: CartLine;
  product: DetailedProduct;
}

export interface Voucher {
  label: string;
  /** "flat" is a fixed amount off, "percent" is a share of the discounted subtotal. */
  type: "flat" | "percent";
  amount: number;
  minSubtotal?: number;
}

export interface CartLine {
  /** Product id plus the chosen option, so two configurations stay separate lines. */
  key: string;
  id: string;
  qty: number;
  /** Price per unit at the time it was added (includes any package option). */
  unitPrice: number;
  option?: string;
}
