export type OrderStage =
  | "awaitingPayment"
  | "inTransit"
  | "checking"
  | "packing"
  | "completed";

export type PaymentState = "awaitingTransfer" | "paid" | "onHold" | "settled";

export type AccountTier = "enterprise" | "business" | "printShop" | "home";

export type OrderPriority =
  | "urgent"
  | "bulk"
  | "installation"
  | "service"
  | "hold"
  | "standard"
  | "vip";

export type OrderRange = "all" | "30d" | "7d";
export type OrderSort = "newest" | "oldest" | "high" | "low";

export interface OrderRow {
  id: string;
  hex: string;
  priority: OrderPriority;
  placedAt: string;
  customer: {
    name: string;
    org: string;
    initials: string;
    tier: AccountTier;
  };
  allocation: {
    title: string;
    quantity: number;
    unit: "item" | "pack";
    spec: string;
    icon: string;
  };
  amount: number;
  stage: OrderStage;
  paymentNote: string;
  statusNote: string;
}

export interface OrdersQuery {
  q: string;
  stage: "all" | OrderStage;
  payment: "all" | PaymentState;
  tier: "all" | AccountTier;
  range: OrderRange;
  sort: OrderSort;
  page: number;
  perPage: number;
}

export type OrderCounts = Record<"all" | OrderStage, number>;

export interface OrdersResponse {
  rows: OrderRow[];
  /** Rows matching every filter (drives pagination). */
  total: number;
  /** Per-stage counts under the current non-stage filters (drives the tabs). */
  counts: OrderCounts;
  kpis: {
    totalOrders: number;
    historicalDelta: number;
    volume: number;
    pendingPayment: number;
    onHold: number;
  };
}

export interface CreateOrderInput {
  customerId: number;
  productId: number;
  quantity: number;
  priority: OrderPriority;
}

export interface OrderPricing {
  subtotal: number;
  setupFee: number;
  courier: number;
  discountRate: number;
  discount: number;
  vat: number;
  total: number;
}

export interface OrderLine {
  sku: string;
  title: string;
  spec: string;
  icon: string;
  quantity: number;
  unit: "item" | "pack";
  unitPrice: number;
  total: number;
}

export type PhaseState = "done" | "active" | "pending";

export interface OrderPhase {
  stage: OrderStage;
  title: string;
  detail: string;
  state: PhaseState;
}

export interface OrderNote {
  id: number;
  author: string;
  ago: string;
  text: string;
  urgent: boolean;
}

export interface LedgerEvent {
  at: string;
  text: string;
}

export interface OrderDetail {
  row: OrderRow;
  lines: OrderLine[];
  pricing: OrderPricing;
  phases: OrderPhase[];
  customer: {
    role: string;
    email: string;
    phone: string;
    taxId: string;
    lifetimeValue: number;
    orders: number;
  };
  shipment: {
    status: string;
    carrier: string;
    waybill: string;
    origin: string;
    destination: string;
    parcel: { parcels: string; weight: string; signature: string };
    trace: number[];
  };
  directive: { quote: string; recordedAt: string };
  notes: OrderNote[];
  ledger: LedgerEvent[];
}
