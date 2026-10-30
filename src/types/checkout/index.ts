export interface CheckoutAmounts {
  units: number;
  subtotal: number;
  volume: number;
  voucher: number;
  voucherLabel?: string;
  shipping: number;
  tax: number;
  total: number;
}

export type PaymentMethodId = "card" | "vodafone" | "instapay";

export interface PaymentMethod {
  id: PaymentMethodId;
  label: string;
  note: string;
}

export interface DeliveryOption {
  id: "crated" | "express" | "pickup";
  label: string;
  note: string;
  /** Working days until delivery or pickup. */
  days: number;
  icon: string;
}
