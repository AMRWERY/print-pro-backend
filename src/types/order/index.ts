import type { PaymentMethodId } from "~/types/checkout";

export interface OrderItem {
  key: string;
  id: string;
  name: string;
  brand: string;
  qty: number;
  unitPrice: number;
  option?: string;
  sku?: string;
  icon: string;
  image?: string;
  imageAlt?: string;
  specs: string[];
}

export interface OrderAmounts {
  units: number;
  subtotal: number;
  volume: number;
  voucher: number;
  voucherLabel?: string;
  shipping: number;
  tax: number;
  total: number;
}

export interface Order {
  id: string;
  /** ISO timestamp. */
  createdAt: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postal: string;
    country: string;
  };
  delivery: { id: string; label: string; note: string; days: number };
  payment: { id: PaymentMethodId; label: string; last4?: string };
  notes?: string;
  items: OrderItem[];
  amounts: OrderAmounts;
  /** Short code the customer quotes when tracking the order. */
  pin: string;
}

export interface Step {
  key: string;
  title: string;
  body: string;
  status: StepStatus;
  at?: Date | null;
}

export type StepStatus = "done" | "current" | "queued";

export interface TimelineStep {
  key: string;
  title: string;
  body: string;
  status: StepStatus;
  /** Shown as the time for the step; null means "in progress". */
  when: Date | null;
}