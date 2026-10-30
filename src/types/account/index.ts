export interface AccountNavItem {
  key: "overview" | "orders" | "registry" | "vault" | "settings";
  label: string;
  /** Shorter label for the phone bar. */
  short: string;
  to: string;
  icon: string;
}