export type OperatingMode =
  | "standard"
  | "high-volume"
  | "new-member"
  | "vip-escrow";

export type AtelierTab =
  | "overview"
  | "orders"
  | "registry"
  | "vault"
  | "settings";

export interface AtelierProfile {
  id: string;
  name: string;
  title: string;
  affiliation: string;
  tierTag: string;
  tierName: string;
  metrologyId: string;
  avatarUrl: string;
  escrowLimit: number;
  escrowAvailable: number;
  auditSyncTime: string;
  proofDrift: string;
  cleanroomDock: string;
  cleanroomSpecs: string;
  securityAuth: string;
  securityStatus: string;
  deltaEAvg: number;
  chamberHumidity: number;
  chamberPressure: number;
}

export interface RequisitionOrder {
  id: string;
  crateId?: string;
  title: string;
  status: "processing" | "in-transit" | "delivered" | "archived" | "recalled";
  statusLabel: string;
  badgeLabel?: string;
  waybill?: string;
  serial?: string;
  date?: string;
  dispatchedFrom?: string;
  destination?: string;
  traceTelemetry?: string;
  flight?: {
    code: string;
    route: string;
    altitude: string;
    cargoTemp: string;
    humidity: string;
    status: string;
    currentStageIndex: number;
    stages: string[];
    gForce: string;
  };
  benchVerified?: string;
  calibrationLog?: string;
  amount: number;
  /** ISO timestamp the order was placed. */
  placedAt?: string;
  /** True for orders placed through checkout on this device (the rest are demo history). */
  real?: boolean;
  items: {
    name: string;
    thumb?: string;
    icon?: string;
    sku?: string;
    quantity?: number;
  }[];
}

export interface RegistryItem {
  id: string;
  name: string;
  category: string;
  statusBadge: string;
  specNotes: string;
  price: number;
  image?: string;
  icon?: string;
  units?: number;
}

export interface ReceivingDock {
  id: string;
  name: string;
  code: string;
  typeBadge: string;
  clearanceBadge: string;
  address: string;
  climateSpecs: string;
  securityClearance: string;
  telemetry: string;
  bondedAgent?: string;
  isPrimary?: boolean;
}

export interface AuditLogEntry {
  id: string;
  title: string;
  timestamp: string;
  summary: string;
  hash: string;
  category: "qa" | "escrow" | "security" | "metrology";
  severity?: "nominal" | "verified" | "action";
}

export interface CompanionProduct {
  id: string;
  name: string;
  tag: string;
  badge: string;
  description: string;
  price: number;
  image?: string;
  icon?: string;
}
