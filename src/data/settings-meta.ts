import type {
  CardMethod,
  CurrencyCode,
  EscortTier,
  RoundingMode,
  SettingsKey,
  SettingsSectionMeta
} from "~/types/admin/settings";

// Labels and the section map for the settings screen (no Tailwind classes, see order-meta.ts).
export const sectionList: SettingsSectionMeta[] = [
  { id: "store", label: "Store information", key: "store", group: "Store & brand" },
  { id: "contact", label: "Contact & support desk", key: "contact", group: "Store & brand" },
  { id: "currency", label: "Currency & FX", key: "currency", group: "Fiscal & settlement" },
  { id: "tax", label: "Tax & exemptions", key: "tax", group: "Fiscal & settlement" },
  { id: "payments", label: "Payments", key: "payments", group: "Commerce" },
  { id: "shipping", label: "Delivery", key: "shipping", group: "Commerce" },
  { id: "orders", label: "Order processing", key: "orders", group: "Commerce" },
  { id: "inventory", label: "Inventory & warehouses", key: "inventory", group: "Operations" },
  { id: "security", label: "Security", key: "security", group: "Security & system" },
  { id: "integrations", label: "Notifications & webhooks", key: "integrations", group: "Security & system" },
  { id: "email", label: "Email & signatures", key: "email", group: "Security & system" },
  { id: "seo", label: "SEO & schema", key: "seo", group: "Security & system" },
  { id: "ergonomics", label: "Workstation", key: "ergonomics", group: "Security & system" },
];

export const sectionKeyLabel: Record<SettingsKey, string> = Object.fromEntries(
  sectionList.map((s) => [s.key, s.label]),
) as Record<SettingsKey, string>;

export const timezoneOptions = [
  "Africa/Cairo",
  "Europe/Zurich",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Tokyo",
  "UTC",
].map((value) => ({ value, label: value.replace("_", " ") }));

export const currencyOptions: { value: CurrencyCode; label: string }[] = [
  { value: "EGP", label: "EGP · Egyptian pound" },
  { value: "EUR", label: "EUR · Euro" },
  { value: "CHF", label: "CHF · Swiss franc" },
  { value: "USD", label: "USD · US dollar" },
  { value: "GBP", label: "GBP · Pound sterling" },
];

export const roundingOptions: { value: RoundingMode; label: string }[] = [
  { value: "cent", label: "Exact (to the cent)" },
  { value: "unit", label: "Whole units" },
  { value: "five", label: "Nearest 5" },
];

export const cardMethodOptions: { value: CardMethod; label: string; description: string }[] = [
  { value: "wallet", label: "Wallets", description: "Apple Pay, Google Pay" },
  { value: "sepa", label: "SEPA debit", description: "Direct debit mandates" },
  { value: "zero-liability", label: "Zero-liability cards", description: "Chargeback protection" },
  { value: "local", label: "Local methods", description: "Region-specific payment options" },
];

export const escortOptions: { value: EscortTier; label: string; description: string }[] = [
  { value: "standard", label: "Standard courier", description: "Tracked courier, signature on delivery" },
  { value: "dedicated", label: "Same-day courier", description: "Single-parcel courier, same day in-city" },
  { value: "armored", label: "Installation team", description: "Technician delivery and installation for heavy machines" },
  { value: "diplomatic", label: "Cross-border freight", description: "Sealed freight with customs paperwork" },
];

export const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" });
