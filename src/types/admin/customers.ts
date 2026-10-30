export type CustomerSegment = "enterprise" | "business" | "printShop" | "home" | "highLtv";

export type CustomerStatus = "active" | "audit" | "dormant";

export type CustomerTier = "AAA" | "AA" | "A";

export type CustomerActivity = "all" | "7d" | "30d" | "90d";

export type CustomerSort = "spend" | "spendLow" | "name" | "newest";

export interface Customer {
  id: string;
  initials: string;
  name: string;
  org: string;
  role: string;
  email: string;
  phone: string;
  /** Region or branch, for example "Cairo". */
  node: string;
  segment: CustomerSegment;
  tier: CustomerTier;
  status: CustomerStatus;
  /** ISO time of the last order or login. */
  lastActivity: string;
  /** Lifetime value: everything this client has spent. */
  ltv: number;
  orders: number;
  activeOrders: number;
  paymentRating: number;
  taxId: string;
  deliveryAddress: string;
  paymentTerms: string;
  createdAt: string;
}

export interface CustomerQuery {
  q: string;
  segment: "all" | CustomerSegment;
  status: "all" | CustomerStatus;
  activity: CustomerActivity;
  sort: CustomerSort;
  page: number;
  perPage: number;
}

export interface CustomersResponse {
  rows: Customer[];
  total: number;
  counts: Record<"all" | CustomerSegment, number>;
  kpis: {
    total: number;
    newThisQuarter: number;
    retentionPct: number;
    spend: number;
    avgLtv: number;
    activeOrders: number;
    activeClients: number;
    vip: number;
  };
}

export interface CustomerNote {
  id: number;
  author: string;
  text: string;
  urgent: boolean;
  at: string;
}

export interface CustomerOrderSummary {
  id: string;
  title: string;
  amount: number;
  placedAt: string;
  stageLabel: string;
}

export interface CustomerDetail extends Customer {
  notes: CustomerNote[];
  recentOrders: CustomerOrderSummary[];
}

/** The fields the register form edits. */
export interface CustomerInput {
  name: string;
  org: string;
  role: string;
  email: string;
  phone: string;
  node: string;
  segment: CustomerSegment;
  tier: CustomerTier;
  status: CustomerStatus;
  taxId: string;
  deliveryAddress: string;
  paymentTerms: string;
}
