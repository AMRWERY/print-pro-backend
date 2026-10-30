import { parseOrdersQuery, queryOrders } from "~/data/admin-orders";
import { initialsOf } from "~/data/customer-meta";
import { stageMeta } from "~/data/order-meta";
import { persistentList, persistentValue } from "~/db/persist";
import type {
  Customer,
  CustomerActivity,
  CustomerDetail,
  CustomerInput,
  CustomerNote,
  CustomerQuery,
  CustomerSegment,
  CustomerSort,
  CustomerStatus,
  CustomerTier,
  CustomersResponse,
} from "~/types/admin/customers";

// Demo client registry. When the app has a backend this file goes away and
// server/api/admin/customers/* proxies the real service.

const DEMO_NOW = Date.UTC(2026, 9, 31, 15, 0, 0);
const DAY = 86_400_000;
const TOTAL = 1420;

const NODES = ["Cairo", "Giza", "Alexandria", "Riyadh", "Dubai", "Jeddah", "Amman", "Doha", "Mansoura", "Tanta", "Luxor", "Kuwait City"];

type Seed = Omit<Customer, "id" | "initials" | "createdAt" | "lastActivity" | "taxId" | "deliveryAddress" | "paymentTerms"> & {
  taxId?: string;
};

const seeds: Seed[] = [
  { name: "Dr. Amal Fahmy", org: "Delta Architects", role: "Head of Operations", email: "a.fahmy@deltaarchitects.com", phone: "+20 2 3335 7710", node: "Cairo", segment: "enterprise", tier: "AAA", status: "active", ltv: 142500, orders: 9, activeOrders: 1, paymentRating: 99.8 },
  { name: "Karim Mansour", org: "Nile Print House", role: "Owner & Production Manager", email: "k.mansour@nileprint.com", phone: "+20 2 2574 5500", node: "Cairo", segment: "printShop", tier: "AA", status: "active", ltv: 18200, orders: 6, activeOrders: 0, paymentRating: 99.1 },
  { name: "Omar Sherif", org: "Sherif Accounting Group", role: "Managing Partner", email: "o.sherif@sherifgroup.com", phone: "+20 3 4865 0912", node: "Alexandria", segment: "enterprise", tier: "AAA", status: "active", ltv: 36400, orders: 7, activeOrders: 0, paymentRating: 99.4 },
  { name: "Hala Youssef", org: "Cairo Language School", role: "Head of Administration", email: "h.youssef@cairolanguage.edu.eg", phone: "+20 2 2735 0143", node: "Giza", segment: "business", tier: "AA", status: "active", ltv: 12800, orders: 5, activeOrders: 1, paymentRating: 98.7 },
  { name: "Prof. Mariam Adel", org: "Alexandria University Press", role: "Press Director", email: "m.adel@alexpress.edu.eg", phone: "+20 3 4883 4100", node: "Alexandria", segment: "enterprise", tier: "AAA", status: "active", ltv: 41200, orders: 8, activeOrders: 0, paymentRating: 99.6 },
  { name: "Layla Haddad", org: "Haddad Design Co. Dubai", role: "Founder & Print Lead", email: "l.haddad@haddaddesign.ae", phone: "+971 4 555 1188", node: "Dubai", segment: "printShop", tier: "A", status: "active", ltv: 9600, orders: 4, activeOrders: 0, paymentRating: 98.2 },
];

const FIRST = ["Mona", "Khaled", "Rania", "Tamer", "Yasmin", "Hossam", "Noor", "Ali", "Mina", "Sherif", "Heba", "Mostafa", "Salma", "Ziad", "Aya", "Marwan", "Farah", "Layla", "Waleed", "Dalia"];
const LAST = ["Hassan", "Mahmoud", "Saleh", "Abdelrahman", "Khalil", "Fathy", "Nasser", "Ibrahim", "Zaki", "Darwish", "Samir", "Ghoneim", "Taha", "Mostafa", "Elsayed", "Kamel", "Hamdy", "Radwan", "Salem", "Anwar"];
const ORG_BY_SEGMENT: Record<CustomerSegment, [string, string[]]> = {
  enterprise: ["Group", ["Holdings", "Corporation"]],
  business: ["Office", ["Services", "Consultants"]],
  printShop: ["Print", ["Works", "Copy Centre"]],
  home: ["Home Office", ["Desk", "Workspace"]],
  highLtv: ["Industries", ["Group", "Trading"]],
};
const ROLE_BY_SEGMENT: Record<CustomerSegment, string[]> = {
  enterprise: ["Head of Operations", "IT Director", "Procurement Manager"],
  business: ["Office Manager", "Administration Lead", "Operations Coordinator"],
  printShop: ["Print Room Manager", "Owner", "Production Lead"],
  home: ["Freelancer", "Home Office Owner", "Consultant"],
  highLtv: ["Managing Director", "Head of Purchasing", "Chief Operating Officer"],
};

// Segment sizes that add up to TOTAL once the six hand-picked clients are counted.
const SIZES: [CustomerSegment, number][] = [
  ["enterprise", 240 - 3],
  ["business", 512 - 1],
  ["printShop", 388 - 2],
  ["home", 194],
  ["highLtv", 86],
];
const segmentOrder = SIZES.flatMap(([s, n]) => Array<CustomerSegment>(n).fill(s));
const GENERATED = TOTAL - seeds.length;

const LTV_RANGE: Record<CustomerSegment, [number, number]> = {
  enterprise: [4000, 30000],
  business: [1000, 14000],
  printShop: [800, 10000],
  home: [2000, 25000],
  highLtv: [50000, 110000],
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");

const finish = (n: number, s: Seed, extra: { createdDaysAgo: number; idleHours: number }): Customer => {
  const city = s.node.split(/[ /]/)[0]!;
  return {
    ...s,
    id: `cu-${n}`,
    initials: initialsOf(s.name),
    lastActivity: new Date(DEMO_NOW - extra.idleHours * 3_600_000).toISOString(),
    createdAt: new Date(DEMO_NOW - extra.createdDaysAgo * DAY).toISOString(),
    taxId: s.taxId ?? `Tax ID ${100 + (n % 800)}-${100000 + ((n * 7919) % 899999)}`,
    deliveryAddress: `${10 + (n % 90)} Main Street, ${s.org}, ${city}`,
    paymentTerms: "Net-30 invoice, bank transfer",
  };
};

const store = persistentList<Customer>("customers", () => {
  let instCount = 0;
  return [
  ...seeds.map((s, i) => finish(i, s, { createdDaysAgo: 400 + i * 30, idleHours: 6 + i * 20 })),
  ...Array.from({ length: GENERATED }, (_, k) => {
    const n = seeds.length + k;
    const segment = segmentOrder[(k * 793) % GENERATED]!;
    const [word, endings] = ORG_BY_SEGMENT[segment];
    const first = FIRST[k % FIRST.length]!;
    const last = LAST[(k * 7 + Math.floor(k / 20)) % LAST.length]!;
    const city = NODES[(k * 5) % NODES.length]!;
    const [lo, hi] = LTV_RANGE[segment];
    const ltv = lo + ((k * 7919) % (hi - lo));
    const status: CustomerStatus = k % 33 === 7 ? "audit" : k % 10 === 3 ? "dormant" : "active";
    // 139 more enterprise clients carry the top tier, which makes 142 with the hand-picked ones.
    const tier: CustomerTier =
      segment === "enterprise" ? (instCount++ < 139 ? "AAA" : "AA") : segment === "business" && k % 3 === 0 ? "AA" : "A";
    const org = `${city} ${word} ${k % 2 ? endings[0] : endings[1]}`;
    return finish(
      n,
      {
        name: `${first} ${last}`,
        org,
        role: ROLE_BY_SEGMENT[segment][k % 3]!,
        email: `${slug(`${first} ${last}`)}@${slug(org).replace(/\./g, "").slice(0, 18)}.com`,
        phone: `+${[20, 966, 971, 974, 962][k % 5]} ${200 + (k % 700)} ${5000 + ((k * 31) % 4999)}`,
        node: city,
        segment,
        tier,
        status,
        ltv,
        orders: Math.round(ltv / 9000) + 1,
        activeOrders: k % 38 === 11 ? 1 : 0,
        paymentRating: Math.round((97 + (k % 30) / 10) * 10) / 10,
      },
      {
        // 41 clients joined within the last quarter.
        createdDaysAgo: k % 34 === 5 ? 3 + (k % 80) : 91 + ((k * 131) % 700),
        idleHours: status === "dormant" ? 24 * (120 + (k % 280)) : (k * 37) % 700,
      },
    );
  }),
  ];
});

const seq = persistentValue("customers.seq", () => TOTAL);
const clock = persistentValue("customers.clock", () => 0);

// --- Query ---

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

export const parseCustomerQuery = (raw: Record<string, unknown>): CustomerQuery => {
  const page = Number.parseInt(String(raw.page), 10);
  return {
    q: typeof raw.q === "string" ? raw.q.trim().slice(0, 80) : "",
    segment: pick(raw.segment, ["all", "enterprise", "business", "printShop", "home", "highLtv"] as const, "all"),
    status: pick(raw.status, ["all", "active", "audit", "dormant"] as const, "all"),
    activity: pick<CustomerActivity>(raw.activity, ["all", "7d", "30d", "90d"], "all"),
    sort: pick<CustomerSort>(raw.sort, ["spend", "spendLow", "name", "newest"], "spend"),
    page: Number.isFinite(page) ? Math.min(100_000, Math.max(1, page)) : 1,
    perPage: Number(pick(String(raw.perPage), ["10", "25", "50"] as const, "10")),
  };
};

export const queryCustomers = (query: CustomerQuery): CustomersResponse => {
  const needle = query.q.toLowerCase();
  const since = query.activity === "all" ? 0 : DEMO_NOW - { "7d": 7, "30d": 30, "90d": 90 }[query.activity] * DAY;

  // Segment counts follow the other filters but not the segment tab itself.
  const base = store.filter(
    (c) =>
      (!needle || [c.name, c.org, c.email, c.role, c.node, c.taxId].join(" ").toLowerCase().includes(needle)) &&
      (query.status === "all" || c.status === query.status) &&
      Date.parse(c.lastActivity) >= since,
  );

  const counts: CustomersResponse["counts"] = { all: base.length, enterprise: 0, business: 0, printShop: 0, home: 0, highLtv: 0 };
  for (const c of base) counts[c.segment]++;

  const filtered = query.segment === "all" ? base : base.filter((c) => c.segment === query.segment);
  const order: Record<CustomerSort, (a: Customer, b: Customer) => number> = {
    spend: (a, b) => b.ltv - a.ltv,
    spendLow: (a, b) => a.ltv - b.ltv,
    name: (a, b) => a.name.localeCompare(b.name),
    newest: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  };
  const sorted = [...filtered].sort(order[query.sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / query.perPage));
  const page = Math.min(query.page, pageCount);

  const spend = store.reduce((sum, c) => sum + c.ltv, 0);
  return {
    rows: sorted.slice((page - 1) * query.perPage, page * query.perPage),
    total: sorted.length,
    counts,
    kpis: {
      total: store.length,
      newThisQuarter: store.filter((c) => Date.parse(c.createdAt) >= DEMO_NOW - 90 * DAY).length,
      retentionPct: 98.4,
      spend,
      avgLtv: store.length ? spend / store.length : 0,
      activeOrders: store.reduce((sum, c) => sum + c.activeOrders, 0),
      activeClients: new Set(store.map((c) => c.node)).size,
      vip: store.filter((c) => c.tier === "AAA").length,
    },
  };
};

// --- Detail, notes ---

// Notes live in their own persisted collection, one document per customer.
const noteDocs = persistentList<{ id: string; notes: CustomerNote[] }>("customers.notes", () => [
  {
    id: "cu-0",
    notes: [
      {
        id: 1,
        author: "COO Admin (Station-01)",
        urgent: true,
        at: new Date(DEMO_NOW - 9 * DAY).toISOString(),
        text: "Customer requires every machine to be test-printed and signed off by a technician before dispatch. Deliveries go by insured courier only, and installation must be booked with reception first.",
      },
    ],
  },
]);
const noteSeq = persistentValue("customers.noteSeq", () => 100);

export const customerDetail = (id: string): CustomerDetail | null => {
  const c = store.find((x) => x.id === id);
  if (!c) return null;
  const recent = queryOrders(parseOrdersQuery({ q: c.name, perPage: "10", sort: "newest" })).rows.slice(0, 3);
  return {
    ...c,
    notes: noteDocs.find((d) => d.id === id)?.notes ?? [],
    recentOrders: recent.map((o) => ({
      id: o.id,
      title: o.allocation.title,
      amount: o.amount,
      placedAt: o.placedAt,
      stageLabel: stageMeta[o.stage].tab,
    })),
  };
};

export const addCustomerNote = (id: string, text: string, urgent: boolean): CustomerNote | null => {
  if (!store.some((c) => c.id === id)) return null;
  const note: CustomerNote = {
    id: ++noteSeq.value,
    author: "COO Admin (Station-01)",
    text,
    urgent,
    at: new Date(DEMO_NOW + 86_400_000 + ++clock.value * 60_000).toISOString(),
  };
  let doc = noteDocs.find((d) => d.id === id);
  if (!doc) noteDocs.push((doc = { id, notes: [] }));
  const list = doc.notes;
  // Urgent notes pin to the top; the rest follow newest first.
  doc.notes = urgent ? [note, ...list] : [...list.filter((n) => n.urgent), note, ...list.filter((n) => !n.urgent)];
  return note;
};

// --- Changes ---

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const validateCustomer = (body: unknown): CustomerInput | null => {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = str(b.name, 80);
  const org = str(b.org, 120);
  const email = str(b.email, 120).toLowerCase();
  if (name.length < 2 || org.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return {
    name,
    org,
    role: str(b.role, 100),
    email,
    phone: str(b.phone, 30),
    node: str(b.node, 60) || "Unassigned",
    segment: pick<CustomerSegment>(b.segment, ["enterprise", "business", "printShop", "home", "highLtv"], "business"),
    tier: pick<CustomerTier>(b.tier, ["AAA", "AA", "A"], "A"),
    status: pick<CustomerStatus>(b.status, ["active", "audit", "dormant"], "active"),
    taxId: str(b.taxId, 40),
    deliveryAddress: str(b.deliveryAddress, 200),
    paymentTerms: str(b.paymentTerms, 120) || "Net-30 invoice, bank transfer",
  };
};

export const emailTaken = (email: string, exceptId?: string) =>
  store.some((c) => c.email === email && c.id !== exceptId);

export const createCustomer = (input: CustomerInput): Customer => {
  const n = seq.value++;
  const now = new Date(DEMO_NOW + 86_400_000 + ++clock.value * 60_000).toISOString();
  const customer: Customer = {
    ...input,
    id: `cu-${n}`,
    initials: initialsOf(input.name),
    lastActivity: now,
    createdAt: now,
    ltv: 0,
    orders: 0,
    activeOrders: 0,
    paymentRating: 100,
  };
  store.unshift(customer);
  return customer;
};

export const updateCustomer = (id: string, input: CustomerInput): Customer | null => {
  const customer = store.find((c) => c.id === id);
  if (!customer) return null;
  Object.assign(customer, input, { initials: initialsOf(input.name) });
  return customer;
};

export const deleteCustomers = (ids: string[]): number => {
  const gone = new Set(ids);
  const before = store.length;
  for (let i = store.length - 1; i >= 0; i--) {
    if (gone.has(store[i]!.id)) {
      const nd = noteDocs.findIndex((d) => d.id === store[i]!.id);
      if (nd >= 0) noteDocs.splice(nd, 1);
      store.splice(i, 1);
    }
  }
  return before - store.length;
};

export const findCustomer = (id: string) => store.find((c) => c.id === id);
