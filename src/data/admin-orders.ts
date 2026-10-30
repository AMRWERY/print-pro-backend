import type {
  AccountTier,
  CreateOrderInput,
  PaymentState,
  OrderCounts,
  OrderPriority,
  LedgerEvent,
  OrderDetail,
  OrderLine,
  OrderNote,
  OrderPhase,
  OrderRow,
  OrderStage,
  OrdersQuery,
  OrderPricing,
  OrdersResponse,
} from "~/types/admin/orders";
import { orderPricing } from "~/data/order-pricing";
import { persistentList, persistentValue } from "~/db/persist";

// Demo orders for the orders screen. When the app has a backend this file goes away and
// server/api/admin/orders.* proxies the real service.

export const customers: {
  name: string;
  org: string;
  initials: string;
  tier: AccountTier;
}[] = [
  { name: "Dr. Amal Fahmy", org: "Delta Architects", initials: "AF", tier: "enterprise" },
  { name: "Karim Mansour", org: "Nile Print House", initials: "KM", tier: "printShop" },
  { name: "Hala Youssef", org: "Cairo Language School", initials: "HY", tier: "business" },
  { name: "Omar Sherif", org: "Sherif Accounting Group", initials: "OS", tier: "enterprise" },
  { name: "Mariam Adel", org: "Alexandria University Press", initials: "MA", tier: "business" },
  { name: "Tarek Nabil", org: "Nabil Home Office", initials: "TN", tier: "home" },
  { name: "Dina Hassan", org: "Hassan Medical Clinics", initials: "DH", tier: "enterprise" },
  { name: "Youssef Gamal", org: "Gamal Engineering Consultants", initials: "YG", tier: "business" },
  { name: "Salma Rashed", org: "Rashed Law Offices", initials: "SR", tier: "business" },
  { name: "Ahmed Al-Zahrani", org: "Riyadh Education Group", initials: "AZ", tier: "enterprise" },
  { name: "Layla Haddad", org: "Haddad Design Co. Dubai", initials: "LH", tier: "printShop" },
  { name: "Nadia Farouk", org: "Farouk Home Office", initials: "NF", tier: "home" },
];

export const orderProducts: {
  title: string;
  unit: "item" | "pack";
  spec: string;
  icon: string;
  price: number;
}[] = [
  { title: "Kopira Pro A3 35 ppm Mono", unit: "item", spec: "Copy, print, scan, fax · finisher ready", icon: "lucide:copy", price: 58900 },
  { title: 'Nordjet Large-Format 44" CAD & Poster', unit: "item", spec: "5 inks · stand included", icon: "lucide:printer", price: 82500 },
  { title: "Corex Toner Black 210 High-Yield", unit: "item", spec: "6,000 pages per cartridge", icon: "lucide:droplets", price: 2100 },
  { title: "Corex Laser 450 Colour", unit: "item", spec: "A4 colour laser · 28 ppm · duplex", icon: "lucide:printer", price: 14900 },
  { title: "Kopira Toner Black A3 Series", unit: "item", spec: "30,000 pages per cartridge", icon: "lucide:droplets", price: 2800 },
  { title: "Printa Tank 500 Ink-Tank All-Colour", unit: "item", spec: "A4 ink-tank · automatic duplex", icon: "lucide:printer", price: 5400 },
  { title: "Nordjet Pigment Ink 8-Colour Set", unit: "pack", spec: "8 × 130 ml pigment set", icon: "lucide:droplets", price: 4900 },
  { title: "Kopira Pro A3 45 ppm Colour", unit: "item", spec: "Booklet finisher included", icon: "lucide:copy", price: 118000 },
  { title: "Corex Laser 700 A3 Mono", unit: "item", spec: "A3 mono laser · 40 ppm", icon: "lucide:printer", price: 27400 },
  { title: "Kopira Drum Unit A3 Series", unit: "item", spec: "100,000 pages per drum", icon: "lucide:cylinder", price: 6400 },
  { title: 'Nordjet Large-Format 24" Plotter', unit: "item", spec: "A1 drawings · roll feed", icon: "lucide:printer", price: 38900 },
  { title: "Corex Toner Colour Set 450", unit: "pack", spec: "C/M/Y/K toner set", icon: "lucide:droplets", price: 5200 },
];

const TOTAL = 1284;
// Stage sizes that add up to TOTAL. They are spread through the list with a stride (793) that
// is coprime with 1284, so every page shows a mix of stages.
const STAGE_SIZES: [OrderStage, number][] = [
  ["awaitingPayment", 42],
  ["inTransit", 86],
  ["checking", 38],
  ["packing", 14],
  ["completed", TOTAL - 42 - 86 - 38 - 14],
];

const stageOrder = STAGE_SIZES.flatMap(([stage, n]) =>
  Array<OrderStage>(n).fill(stage),
);

const PRIORITIES: OrderPriority[] = [
  "urgent",
  "bulk",
  "installation",
  "service",
  "hold",
  "standard",
  "vip",
];

const PAYMENT_NOTES: Record<OrderStage, string[]> = {
  awaitingPayment: [
    "Transfer reference pending",
    "Transfer reference matched",
    "Awaiting purchase order approval",
  ],
  inTransit: [
    "Paid by bank transfer",
    "Paid by card",
    "Paid on account (30 days)",
  ],
  checking: [
    "Paid · held until tests pass",
    "Paid · test print under review",
    "Paid · awaiting technician sign-off",
  ],
  packing: ["Paid by bank transfer", "Paid on account (30 days)"],
  completed: [
    "Paid in full",
    "Invoice settled",
    "Payment received",
  ],
};
const STATUS_NOTES: Record<OrderStage, string[]> = {
  awaitingPayment: ["Warehouse bay 3", "Warehouse bay 7", "Held in the Cairo warehouse"],
  inTransit: [
    "Courier · tracking #CR-889",
    "Cairo → customer address",
    "Express lane 2",
  ],
  checking: [
    "Test bay #04 · print test",
    "Test bay #02 · paper path",
    "Test bay #07 · network setup",
  ],
  packing: ["Packing bay B · 4 h left", "Packing bay A · 1 h left"],
  completed: ["Delivered and signed", "Installed on site", "Delivered · closed"],
};

/** The list has a fixed "now" so filters and sorting are stable between reloads. */
const DEMO_NOW = Date.UTC(2026, 9, 31, 15, 0, 0);
const LATEST = Date.UTC(2026, 9, 31, 14, 22, 8);

const hexOf = (id: number) =>
  `0x${((id * 2654435761) >>> 0).toString(16).toUpperCase().slice(0, 5)}`;

/** Extra supplies on an order, derived from its id so the list and detail agree. */
const extrasFor = (idNumber: number, mainIx: number) => {
  const out: { ix: number; quantity: number }[] = [];
  for (let k = 0; k < idNumber % 3; k++) {
    const ix = (idNumber * 5 + k * 3 + 1) % orderProducts.length;
    if (ix !== mainIx && !out.some((o) => o.ix === ix))
      out.push({ ix, quantity: 1 + ((idNumber + k) % 2) });
  }
  return out;
};

const build = (
  idNumber: number,
  placedAt: number,
  customerIx: number,
  productIx: number,
  quantity: number,
  priority: OrderPriority,
  stage: OrderStage,
  variant: number,
): OrderRow => {
  const a = orderProducts[productIx]!;
  const customer = customers[customerIx]!;
  const pick = (list: string[]) => list[variant % list.length]!;
  const priced = [
    { unitPrice: a.price, quantity },
    ...extrasFor(idNumber, productIx).map((e) => ({
      unitPrice: orderProducts[e.ix]!.price,
      quantity: e.quantity,
    })),
  ];
  return {
    id: `#LP-${idNumber}`,
    hex: hexOf(idNumber),
    priority,
    placedAt: new Date(placedAt).toISOString(),
    customer: { ...customer },
    allocation: {
      title: a.title,
      quantity,
      unit: a.unit,
      spec: a.spec,
      icon: a.icon,
    },
    amount: orderPricing(priced, customer.tier).total,
    stage,
    paymentNote: pick(PAYMENT_NOTES[stage]),
    statusNote: pick(STATUS_NOTES[stage]),
  };
};

const generated = persistentList<OrderRow>("orders", () => {
  let at = LATEST;
  return Array.from({ length: TOTAL }, (_, i) => {
    if (i) at -= (15 + ((i * 37) % 40)) * 60_000;
    return build(
      948201 - i * 2 - Math.floor(i / 3),
      at,
      (i * 5) % customers.length,
      (i * 7 + Math.floor(i / 12)) % orderProducts.length,
      1 + ((i * 3) % 6),
      PRIORITIES[(i * 5) % PRIORITIES.length]!,
      stageOrder[(i * 793) % TOTAL]!,
      i,
    );
  });
});

// Orders created through the API (newest first).
const created = persistentList<OrderRow>("orders.created", () => []);

const allOrders = () => [...created, ...generated];

/** The real content of an order placed on the storefront: what the detail screen shows instead of the demo lines. */
export interface PlacedOrder {
  /** Same as the order row id, e.g. "#LP-948203". */
  id: string;
  lines: OrderLine[];
  pricing: OrderPricing;
  contact: { email: string; phone: string; address: string };
  /** Storefront account that placed it, when signed in. */
  userId?: string;
}
const placed = persistentList<PlacedOrder>("orders.placed", () => []);

export interface PlaceOrderInput {
  customer: { name: string; org: string; tier: AccountTier };
  lines: OrderLine[];
  pricing: OrderPricing;
  paid: boolean;
  contact: PlacedOrder["contact"];
  userId?: string;
}

/** Adds an order placed on the storefront to the admin register. Returns the row (its id is the public order number). */
export const recordPlacedOrder = (input: PlaceOrderInput): OrderRow => {
  const idNumber = 948202 + created.length;
  const first = input.lines[0]!;
  const stage: OrderStage = input.paid ? "checking" : "awaitingPayment";
  const initials = input.customer.name
    .split(/s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const row: OrderRow = {
    id: `#LP-${idNumber}`,
    hex: hexOf(idNumber),
    priority: "standard",
    placedAt: new Date().toISOString(),
    customer: { name: input.customer.name, org: input.customer.org, initials, tier: input.customer.tier },
    allocation: {
      title: input.lines.length > 1 ? `${first.title} + ${input.lines.length - 1} more` : first.title,
      quantity: input.lines.reduce((n, l) => n + l.quantity, 0),
      unit: first.unit,
      spec: first.spec,
      icon: first.icon,
    },
    amount: input.pricing.total,
    stage,
    paymentNote: PAYMENT_NOTES[stage][0]!,
    statusNote: STATUS_NOTES[stage][0]!,
  };
  created.unshift(row);
  placed.push({ id: row.id, lines: input.lines, pricing: input.pricing, contact: input.contact, userId: input.userId });
  logEvent(row.id, "Order placed on the storefront");
  return row;
};

export const placedOrderOf = (id: string) => placed.find((o) => o.id === id);
export const placedOrdersOf = (userId: string) => placed.filter((o) => o.userId === userId);

export const paymentStateOf = (stage: OrderStage): PaymentState =>
  ({
    awaitingPayment: "awaitingTransfer",
    inTransit: "paid",
    checking: "onHold",
    packing: "paid",
    completed: "settled",
  })[stage] as PaymentState;

const pick = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;

const int = (value: unknown, fallback: number, min: number, max: number) => {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Turns untrusted query-string values into a safe OrdersQuery. */
export const parseOrdersQuery = (
  raw: Record<string, unknown>,
): OrdersQuery => ({
  q: typeof raw.q === "string" ? raw.q.trim().slice(0, 80) : "",
  stage: pick(
    raw.stage,
    ["all", ...STAGE_SIZES.map(([s]) => s)] as const,
    "all",
  ),
  payment: pick(
    raw.payment,
    ["all", "awaitingTransfer", "paid", "onHold", "settled"] as const,
    "all",
  ),
  tier: pick(
    raw.tier,
    ["all", "enterprise", "business", "printShop", "home"] as const,
    "all",
  ),
  range: pick(raw.range, ["all", "30d", "7d"] as const, "all"),
  sort: pick(raw.sort, ["newest", "oldest", "high", "low"] as const, "newest"),
  page: int(raw.page, 1, 1, 10_000),
  perPage: Number(pick(String(raw.perPage), ["10", "25", "50"] as const, "10")),
});

export const queryOrders = (query: OrdersQuery): OrdersResponse => {
  const perPage = query.perPage;
  const needle = query.q.toLowerCase();
  const since =
    query.range === "all"
      ? 0
      : DEMO_NOW - (query.range === "7d" ? 7 : 30) * 86_400_000;

  const matchesBase = (o: OrderRow) =>
    (!needle ||
      [
        o.id,
        o.hex,
        o.customer.name,
        o.customer.org,
        o.allocation.title,
        o.allocation.spec,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)) &&
    (query.payment === "all" || paymentStateOf(o.stage) === query.payment) &&
    (query.tier === "all" || o.customer.tier === query.tier) &&
    Date.parse(o.placedAt) >= since;

  const base = allOrders().filter(matchesBase);

  const counts: OrderCounts = {
    all: base.length,
    awaitingPayment: 0,
    inTransit: 0,
    checking: 0,
    packing: 0,
    completed: 0,
  };
  for (const o of base) counts[o.stage]++;

  const filtered =
    query.stage === "all" ? base : base.filter((o) => o.stage === query.stage);

  const sorted = [...filtered].sort((a, b) => {
    switch (query.sort) {
      case "oldest":
        return Date.parse(a.placedAt) - Date.parse(b.placedAt);
      case "high":
        return b.amount - a.amount;
      case "low":
        return a.amount - b.amount;
      default:
        return Date.parse(b.placedAt) - Date.parse(a.placedAt);
    }
  });

  const pageCount = Math.max(1, Math.ceil(sorted.length / perPage));
  const page = Math.min(query.page, pageCount);

  const everything = allOrders();
  return {
    rows: sorted.slice((page - 1) * perPage, page * perPage),
    total: sorted.length,
    counts,
    kpis: {
      totalOrders: everything.length,
      historicalDelta: 4.2,
      volume: 482940,
      pendingPayment: 74210,
      onHold: 9,
    },
  };
};

export const createOrder = (input: CreateOrderInput): OrderRow => {
  const id = 948202 + created.length;
  const row = build(
    id,
    DEMO_NOW + (created.length + 1) * 60_000,
    input.customerId,
    input.productId,
    input.quantity,
    input.priority,
    "awaitingPayment",
    id,
  );
  created.unshift(row);
  return row;
};

export const validateCreateOrder = (body: unknown): CreateOrderInput | null => {
  const b = (body ?? {}) as Record<string, unknown>;
  const customerId = Number(b.customerId);
  const productId = Number(b.productId);
  const quantity = Number(b.quantity);
  const priority = pick(b.priority, PRIORITIES, "standard");
  if (
    !Number.isInteger(customerId) ||
    customerId < 0 ||
    customerId >= customers.length ||
    !Number.isInteger(productId) ||
    productId < 0 ||
    productId >= orderProducts.length ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 50
  )
    return null;
  return { customerId, productId, quantity, priority };
};

// ---------------------------------------------------------------------------
// Order detail
// ---------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortStamp = (iso: string) =>
  `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))} ${iso.slice(11, 16)} UTC`;

const skuOf = (ix: number) =>
  `${orderProducts[ix]!.title
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.slice(0, 3).toUpperCase())
    .join("-")}-${ix * 37 + 110}`;

export const pipelineStages: { stage: OrderStage; title: string }[] = [
  { stage: "awaitingPayment", title: "Payment confirmed & logged" },
  { stage: "checking", title: "Checked & test-printed" },
  { stage: "packing", title: "Packed & sealed" },
  { stage: "inTransit", title: "Courier dispatch" },
  { stage: "completed", title: "Delivered & installed" },
];

// Where each stage sits in the five-step pipeline (completed = every step done).
const ACTIVE_PHASE: Record<OrderStage, number> = {
  awaitingPayment: 0,
  checking: 1,
  packing: 2,
  inTransit: 3,
  completed: 5,
};

const SHIPMENT_STATUS: Record<OrderStage, string> = {
  awaitingPayment: "Held in the warehouse",
  checking: "Awaiting dispatch",
  packing: "Awaiting dispatch",
  inTransit: "On the way",
  completed: "Delivered",
};

// Notes and events added through the API, persisted per order.
interface OrderExtras {
  id: string;
  notes: OrderNote[];
  events: LedgerEvent[];
}
const extras = persistentList<OrderExtras>("orders.extras", () => []);
const extrasOf = (id: string): OrderExtras => {
  let e = extras.find((x) => x.id === id);
  if (!e) {
    e = { id, notes: [], events: [] };
    extras.push(e);
  }
  return e;
};
const noteSeq = persistentValue("orders.noteSeq", () => 100);
const clock = persistentValue("orders.clock", () => 0);
// New events land after every seeded one, so they always show at the top of the ledger.
const tick = () =>
  new Date(DEMO_NOW + 86_400_000 + ++clock.value * 60_000).toISOString();

export const findOrder = (slug: string) =>
  allOrders().find((o) => o.id === `#${slug}`);

const logEvent = (id: string, text: string) => {
  const e = extrasOf(id);
  e.events = [{ at: tick(), text }, ...e.events];
};

export const orderDetail = (slug: string): OrderDetail | null => {
  const row = findOrder(slug);
  if (!row) return null;

  const idNumber = Number(slug.slice(3));
  const real = placedOrderOf(row.id);
  const mainIx = orderProducts.findIndex((a) => a.title === row.allocation.title);
  const lines: OrderLine[] = real
    ? real.lines
    : [
    { ix: mainIx, quantity: row.allocation.quantity },
    ...extrasFor(idNumber, mainIx),
  ].map(({ ix, quantity }) => {
    const a = orderProducts[ix]!;
    return {
      sku: skuOf(ix),
      title: a.title,
      spec: a.spec,
      icon: a.icon,
      quantity,
      unit: a.unit,
      unitPrice: a.price,
      total: a.price * quantity,
    };
  });

  const active = ACTIVE_PHASE[row.stage];
  const phaseDetail = [
    `Payment confirmed · ${shortStamp(row.placedAt)}`,
    "Test bay #04 · test page and paper path",
    "Boxed with cables and starter supplies",
    "Insured courier · tracking active",
    "Signed for on delivery",
  ];
  const phases: OrderPhase[] = pipelineStages.map((p, i) => ({
    ...p,
    detail: phaseDetail[i]!,
    state: i < active ? "done" : i === active ? "active" : "pending",
  }));

  const mine = allOrders().filter((o) => o.customer.name === row.customer.name);
  const slugName = row.customer.name
    .toLowerCase()
    .replace(/[^a-z]+/g, ".")
    .replace(/^\.|\.$/g, "");
  const domain = row.customer.org.toLowerCase().replace(/[^a-z]+/g, "").slice(0, 14);

  const seedNotes: OrderNote[] = [
    {
      id: 1,
      author: "COO Admin (Station-01)",
      ago: "2 hours ago",
      text: "Test print on the machine showed faint banding on the left edge. Replaced the drum unit and the test pages are now clean.",
      urgent: false,
    },
    {
      id: 2,
      author: "Accounts officer M. Klein",
      ago: "4 hours ago",
      text: `Bank transfer of EGP ${row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} confirmed. Payment recorded against the order.`,
      urgent: false,
    },
  ];

  const at = Date.parse(row.placedAt);
  const stamp = (min: number) => new Date(at + min * 60_000).toISOString();
  const base: LedgerEvent[] = [
    { at: stamp(0), text: `Order created via the customer portal by ${row.customer.name}` },
  ];
  if (active >= 1) {
    base.push({ at: stamp(13), text: "Payment confirmation sent to the customer" });
    base.push({ at: stamp(95), text: "Test report uploaded by Tech-04" });
  }
  if (active >= 3) base.push({ at: stamp(300), text: "Packed and sealed with cables and starter supplies" });
  if (active >= 4) base.push({ at: stamp(480), text: "Delivered and signed for · order completed" });
  else if (active === 3)
    base.push({ at: stamp(480), text: `Courier dispatched · tracking CR-${idNumber}-EG` });

  return {
    row,
    lines,
    pricing: real ? real.pricing : orderPricing(lines, row.customer.tier),
    phases,
    customer: {
      role: ["Office Manager", "Head of IT", "Print Room Supervisor", "Procurement Lead"][idNumber % 4]!,
      email: real ? real.contact.email : `${slugName}@${domain}.com`,
      phone: real
        ? real.contact.phone
        : `+${[20, 966, 971, 974][idNumber % 4]} (${200 + (idNumber % 700)}) ${535 + (idNumber % 400)}-${7000 + (idNumber % 2999)}`,
      taxId: `Tax ID ${100 + (idNumber % 800)}-${100000 + ((idNumber * 7919) % 899999)}`,
      lifetimeValue: Math.round(
        mine.filter((o) => o.stage === "completed").reduce((sum, o) => sum + o.amount, 0),
      ),
      orders: mine.length,
    },
    shipment: {
      status: SHIPMENT_STATUS[row.stage],
      carrier: "PrintPro Delivery (insured courier)",
      waybill: `CR-${idNumber}-EG`,
      origin: "PrintPro Cairo warehouse",
      destination: real ? real.contact.address : `${row.customer.org} — reception`,
      parcel: {
        parcels: String(1 + (idNumber % 3)),
        weight: `${8 + (idNumber % 40)} kg`,
        signature: "Required",
      },
      trace: Array.from({ length: 24 }, (_, i) => 50 + Math.round(Math.sin(i * 1.7 + idNumber) * 8)),
    },
    directive: {
      quote:
        "Please deliver before 11:00 and call the reception desk on arrival. A technician should be present to install the machine and connect it to our network.",
      recordedAt: `Recorded ${shortStamp(row.placedAt)} · from the customer portal`,
    },
    notes: [...(extras.find((x) => x.id === row.id)?.notes ?? []), ...seedNotes],
    ledger: [...(extras.find((x) => x.id === row.id)?.events ?? []), ...base].sort(
      (a, b) => Date.parse(b.at) - Date.parse(a.at),
    ),
  };
};

export const setOrderStage = (slug: string, stage: OrderStage): OrderRow | null => {
  const row = findOrder(slug);
  if (!row) return null;
  if (row.stage !== stage) {
    row.stage = stage;
    row.paymentNote = PAYMENT_NOTES[stage][0]!;
    row.statusNote = STATUS_NOTES[stage][0]!;
    logEvent(
      row.id,
      stage === "completed"
        ? "Order completed and closed by COO Admin"
        : `Pipeline moved to "${pipelineStages.find((p) => p.stage === stage)!.title}" by COO Admin`,
    );
  }
  return row;
};

export const addOrderNote = (slug: string, text: string, urgent: boolean): OrderNote | null => {
  const row = findOrder(slug);
  if (!row) return null;
  const note: OrderNote = {
    id: ++noteSeq.value,
    author: "COO Admin (Station-01)",
    ago: "Just now",
    text,
    urgent,
  };
  // Urgent notes pin to the top; the rest keep newest-first order.
  const ex = extrasOf(row.id);
  const list = ex.notes;
  ex.notes = urgent
    ? [note, ...list]
    : [...list.filter((n) => n.urgent), note, ...list.filter((n) => !n.urgent)];
  logEvent(row.id, "Internal note added by COO Admin");
  return note;
};

export const isOrderSlug = (value: unknown): value is string =>
  typeof value === "string" && /^LP-\d{5,7}$/.test(value);

export const isOrderStage = (value: unknown): value is OrderStage =>
  typeof value === "string" && STAGE_SIZES.some(([s]) => s === value);
