import type { CustomerTier } from "~/types/admin/customers";
import type { ProductCategory } from "~/types/admin/products";

export type CouponType = "percentage" | "fixed" | "freight" | "serviceCredit";

/** What an admin sets. A coupon's visible state is worked out from this and the dates. */
export type CouponStatus = "active" | "paused" | "draft" | "archived";

export type CouponState = "active" | "scheduled" | "depleted" | "expired" | "paused" | "draft";

export type CouponTier = "all" | CustomerTier;

export type CouponSort = "recent" | "expiry" | "usage" | "code";

export type CouponTab = "all" | "active" | "scheduled" | "depleted" | "expired" | "draft";

export interface Coupon {
  id: string;
  code: string;
  campaign: string;
  description: string;
  type: CouponType;
  /** Percent for "percentage", an amount for the others. */
  value: number;
  /** Largest concession a single order can get (percentage coupons). */
  cap: number | null;
  /** Total redemptions allowed; null = unlimited. */
  limit: number | null;
  used: number;
  /** Redemptions allowed per client account; null = unlimited. */
  perAccount: number | null;
  minOrder: number;
  tier: CouponTier;
  /** Divisions the coupon applies to; empty = every division. */
  categories: ProductCategory[];
  /** YYYY-MM-DD, or null for no start / no end. */
  startsAt: string | null;
  endsAt: string | null;
  status: CouponStatus;
  updatedAt: string;
}

export interface CouponRow extends Coupon {
  state: CouponState;
}

export interface CouponQuery {
  q: string;
  tab: CouponTab;
  type: "all" | CouponType;
  tier: CouponTier;
  sort: CouponSort;
  page: number;
  perPage: number;
}

export interface CouponsResponse {
  rows: CouponRow[];
  total: number;
  counts: Record<CouponTab, number>;
  kpis: {
    discountValue: number;
    redemptions: number;
    active: number;
    singleUse: number;
    tiered: number;
    allocatedPct: number;
    capTotal: number;
    capPct: number;
    alerts: number;
    depleted: number;
    expiringSoon: number;
  };
}

/** The fields the voucher form edits. */
export interface CouponInput {
  code: string;
  campaign: string;
  description: string;
  type: CouponType;
  value: number;
  cap: number | null;
  limit: number | null;
  perAccount: number | null;
  minOrder: number;
  tier: CouponTier;
  categories: ProductCategory[];
  startsAt: string | null;
  endsAt: string | null;
  status: CouponStatus;
}

export type CouponBulkAction = "pause" | "resume" | "archive" | "delete";
