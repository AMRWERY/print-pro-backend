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

// The client registry: starts empty, filled from the admin Customers screen.

const DAY = 86_400_000;
const store = persistentList<Customer>("customers", () => []);

const seq = persistentValue("customers.seq", () => 0);
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
  const since = query.activity === "all" ? 0 : Date.now() - { "7d": 7, "30d": 30, "90d": 90 }[query.activity] * DAY;

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
      newThisQuarter: store.filter((c) => Date.parse(c.createdAt) >= Date.now() - 90 * DAY).length,
      retentionPct: store.length ? Math.round((store.filter((c) => c.status !== "dormant").length / store.length) * 1000) / 10 : 0,
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
const noteDocs = persistentList<{ id: string; notes: CustomerNote[] }>("customers.notes", () => []);
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
    author: "Admin",
    text,
    urgent,
    at: new Date(Date.now() + ++clock.value).toISOString(),
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
  const now = new Date(Date.now() + ++clock.value).toISOString();
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
export const allCustomers = () => store;
