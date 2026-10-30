export type StorefrontState = "live" | "maintenance";

export type CurrencyCode = "EGP" | "EUR" | "CHF" | "USD" | "GBP";

export type RoundingMode = "cent" | "unit" | "five";

export type EscortTier = "standard" | "dedicated" | "armored" | "diplomatic";

export type CardMethod = "wallet" | "sepa" | "zero-liability" | "local";

export interface TaxRow {
  id: string;
  jurisdiction: string;
  mechanism: string;
  /** Standard rate in percent. */
  standard: number;
  /** Reduced rate in percent. */
  reduced: number;
  active: boolean;
}

export interface CarrierRow {
  id: string;
  name: string;
  description: string;
  /** Base fee per consignment. */
  fee: number;
  enabled: boolean;
}

export interface Settings {
  store: {
    legalName: string;
    registration: string;
    address: string;
    timezone: string;
    storefront: StorefrontState;
    maintenanceMessage: string;
  };
  contact: {
    email: string;
    phone: string;
    emergencyPhone: string;
    pgpKey: string;
  };
  currency: {
    base: CurrencyCode;
    secondary: CurrencyCode;
    tertiary: CurrencyCode;
    syncMinutes: number;
    rounding: RoundingMode;
    /** Margin added to the mid-market rate, in percent. */
    markup: number;
  };
  tax: {
    vatId: string;
    ossConsolidation: boolean;
    zeroRating: boolean;
    rows: TaxRow[];
  };
  payments: {
    wireEnabled: boolean;
    bankName: string;
    iban: string;
    bic: string;
    approvalLimit: number;
    cardEnabled: boolean;
    cardMethods: CardMethod[];
    holdThreshold: number;
  };
  shipping: {
    carriers: CarrierRow[];
    escortTier: EscortTier;
    freeThreshold: number;
  };
  orders: {
    prefix: string;
    graceMinutes: number;
    maxUnverified: number;
    paymentWindowHours: number;
  };
  inventory: {
    lowStockDefault: number;
    reorderBufferDays: number;
    warehouseSyncMinutes: number;
    autoHold: boolean;
    barcodeVerify: boolean;
  };
  security: {
    requireFido2: boolean;
    physicalPresence: boolean;
    sessionTimeoutMinutes: number;
    /** One CIDR range per line. Empty means any address. */
    ipAllowlist: string;
  };
  integrations: {
    webhookUrl: string;
    slackAlerts: boolean;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    fromName: string;
    fromAddress: string;
    attachTestReports: boolean;
    approverAlerts: boolean;
  };
  seo: {
    defaultTitle: string;
    defaultDescription: string;
    schemaOrg: boolean;
    sitemap: boolean;
  };
  ergonomics: {
    haptic: boolean;
    highContrast: boolean;
  };
}

export type SettingsKey = keyof Settings;

/** What the screen loads: the settings plus read-only facts the admin can't edit here. */
export interface SettingsResponse {
  settings: Settings;
  updatedAt: string;
  updatedBy: string;
  /** Last four characters of the webhook signing secret. */
  secretLast4: string;
  secretRotatedAt: string;
  /** DNS records for outgoing mail, checked by the platform. */
  dns: { type: string; host: string; target: string; ok: boolean }[];
}

export interface SettingsSectionMeta {
  id: string;
  label: string;
  /** The part of the settings object this section edits, used for the unsaved markers. */
  key: SettingsKey;
  group: string;
}