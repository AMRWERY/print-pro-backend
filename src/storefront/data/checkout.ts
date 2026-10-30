import type { DeliveryOption, PaymentMethod } from "~/types/checkout";

export const countries = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "EG", name: "Egypt" },
];

export const deliveryOptions: DeliveryOption[] = [
  {
    id: "crated",
    label: "Standard delivery (insured)",
    note: "Insured courier delivery. Heavy machines are installed by our technicians.",
    days: 5,
    icon: "lucide:truck",
  },
  {
    id: "express",
    label: "Express delivery",
    note: "Next-working-day courier, signature on delivery.",
    days: 2,
    icon: "lucide:zap",
  },
  {
    id: "pickup",
    label: "Pick up from our showroom (Cairo)",
    note: "Collect from our showroom once your order is checked and ready.",
    days: 1,
    icon: "lucide:store",
  },
];

/** Flat price for options that don't follow the free-freight rule. */
export const deliveryPrices = { express: 349, pickup: 0 } as const;

export const paymentMethods: PaymentMethod[] = [
  {
    id: "card",
    label: "Card / bank payment",
    note: "National Bank of Egypt",
  },
  {
    id: "vodafone",
    label: "Vodafone Cash",
    note: "Transfer from your mobile wallet",
  },
  {
    id: "instapay",
    label: "Instapay",
    note: "Instant bank transfer",
  },
];

export const checkoutSteps = [
  { n: 1, title: "Contact & address", short: "Address" },
  { n: 2, title: "Delivery", short: "Delivery" },
  { n: 3, title: "Payment", short: "Payment" },
  { n: 4, title: "Review & place order", short: "Review" },
] as const;
