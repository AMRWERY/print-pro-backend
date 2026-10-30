export type RangeKey = "today" | "week" | "month" | "quarter" | "year";

export type RevenueUnit = "hour" | "day" | "week" | "month";

export interface RevenuePoint {
  revenue: number;
  orders: number;
}

export interface RevenueSeries {
  range: RangeKey;
  unit: RevenueUnit;
  points: RevenuePoint[];
  peakIndex: number;
}

export interface DashboardKpis {
  revenue: { value: number; delta: number; trend: number[] };
  orders: { value: number; delta: number };
  customers: { value: number; delta: number };
  products: { value: number };
  lowStock: { value: number };
  pendingOrders: { value: number };
}

export type StockStatus = "critical" | "depleting" | "scheduled";

export interface LowStockItem {
  sku: string;
  name: string;
  spec: string;
  status: StockStatus;
  remaining: number;
  threshold: number;
  unit: "units" | "packs" | "cartridges";
  note: "lead" | "run" | "edi" | "priority";
  noteValue: string;
  action: "restockMachines" | "restockToner" | "confirmEdi" | "emergencySpares";
}

export type OrderStatus =
  | "awaitingPayment"
  | "checking"
  | "packing"
  | "inTransit"
  | "completed";

export interface OrderSummaryRow {
  id: string;
  client: string;
  location: string;
  allocation: string;
  amount: number;
  status: OrderStatus;
  action: "completeOrder" | "printDeliveryNote" | "viewOrder" | "checkBatch";
}

export interface TopProduct {
  rank: number;
  name: string;
  spec: string;
  division: "printers" | "copiers" | "toner" | "ink";
  unitValue: number;
  volume: number;
  volumeUnit: "units" | "packs" | "cartridges";
  revenue: number;
  qa: string;
  icon: string;
}

export interface RecentCustomer {
  initials: string;
  name: string;
  location: string;
  lifetimeValue: number;
  tier: "enterprise" | "business" | "printShop" | "home";
}

export interface DashboardSummary {
  kpis: DashboardKpis;
  lowStock: LowStockItem[];
  topProducts: TopProduct[];
  orders: { rows: OrderSummaryRow[]; total: number; slaPct: number };
  customers: RecentCustomer[];
}
