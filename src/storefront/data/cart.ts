export const pricing = {
  /** Orders at or above this value (after discounts) ship free. */
  freeFreightFrom: 2500,
  freight: 149,
  taxRate: 0.085,
  /** Ink and toner, 3 or more per line. */
  volumeMinQty: 3,
  volumeRate: 0.07,
};

export const cartAssurances = [
  {
    icon: "lucide:shield-check",
    label: "Manufacturer warranty on every machine",
  },
  {
    icon: "lucide:flask-conical",
    label: "Tested before dispatch",
  },
  { icon: "lucide:truck", label: "Free delivery over EGP 2,500" },
  { icon: "lucide:headset", label: "Support hotline: +1 (800) 412-5866" },
];

/** Suggested pairings for the "complementary" section (skips anything in the cart). */
export const companionIds = [
  "corex-toner-210-hy",
  "kopira-toner-a3-black",
  "printa-ink-black",
  "nordjet-pigment-set",
  "corex-toner-450-set",
  "kopira-drum-a3",
];