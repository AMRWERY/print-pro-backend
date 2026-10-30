import {
  allProducts,
  createProduct,
  deleteProducts,
  findProduct,
  skuExists,
  updateProduct,
  validateProductInput,
} from "~/data/admin-products";
import { persistentList, persistentValue } from "~/db/persist";
import { stockStateOf } from "~/data/product-meta";
import type { Product, ProductCategory } from "~/types/admin/products";
import type {
  AdjustInput,
  InventoryFilter,
  InventoryItem,
  InventoryQuery,
  InventoryResponse,
  ItemInput,
  InventorySort,
  Movement,
  MovementType,
  ReceiveInput,
  TransferInput,
  Warehouse,
} from "~/types/admin/inventory";

// Demo stock ledger. It reads the same register as the Products screen, so a change made
// here shows up there. When the app has a backend this file goes away and
// server/api/admin/inventory/* proxies the real service.

export const WAREHOUSES: Warehouse[] = ["CAI-01", "GIZ-02", "ALX-01"];

const BIN_PREFIX: Record<ProductCategory, string> = {
  printers: "PRN",
  copiers: "CPY",
  "inks-toner": "SUP",
};

// Where an item was moved to; items not listed here sit where they were first shelved.
type Placement = { id: string; warehouse: Warehouse; bin: string };
const placements = persistentList<Placement>("inventory", () => []);
const placementOf = (id: string) => placements.find((m) => m.id === id);
const place = (id: string, where: { warehouse: Warehouse; bin: string }) => {
  const cur = placementOf(id);
  if (cur) Object.assign(cur, where);
  else placements.push({ id, ...where });
};
const unplace = (id: string) => {
  const i = placements.findIndex((m) => m.id === id);
  if (i >= 0) placements.splice(i, 1);
};

const numberOf = (id: string) => Number(id.slice(2)) || 0;

const locate = (p: Product): { warehouse: Warehouse; bin: string } => {
  const override = placementOf(p.id);
  if (override) return { warehouse: override.warehouse, bin: override.bin };
  const n = numberOf(p.id);
  const warehouse: Warehouse = p.category === "copiers" ? "GIZ-02" : n % 5 === 0 ? "ALX-01" : "CAI-01";
  return { warehouse, bin: `${BIN_PREFIX[p.category]}-${String((n % 9) + 1).padStart(2, "0")}` };
};

const toItem = (p: Product): InventoryItem => {
  const reserved = Math.min(p.stock, numberOf(p.id) % 3);
  return {
    ...p,
    ...locate(p),
    reserved,
    available: p.stock - reserved,
    state: stockStateOf(p),
    testHold: p.status === "testing" || p.status === "hold",
  };
};

// --- Movement log (newest first) ---

const DEMO_NOW = Date.UTC(2026, 9, 31, 15, 0, 0);
const at = (hoursAgo: number) => new Date(DEMO_NOW - hoursAgo * 3_600_000).toISOString();

const seq = persistentValue("inventory.seq", () => 0);
const clock = persistentValue("inventory.clock", () => 0);

const entryFor = (
  type: MovementType,
  qty: number | null,
  p: Product,
  note: string,
  when?: string,
): Movement => ({
  id: `m-${++seq.value}`,
  type,
  qty,
  sku: p.sku,
  name: p.name,
  note,
  actor: "COO Admin (Station-01)",
  at: when ?? new Date(DEMO_NOW + ++clock.value * 60_000).toISOString(),
});

// Seeded history, oldest first so the newest ends up on top.
const seedHistory = (): Movement[] => {
  const by = (id: string) => findProduct(id);
  const entries: [string, MovementType, number | null, string, number][] = [
    ["p-5", "testing", -1, "Moved to the test bay for a print-quality check", 30],
    ["p-2", "dispatch", -1, "Dispatched by courier to Delta Architects, Cairo", 21],
    ["p-3", "inbound", 10, "Received from the supplier delivery note. Lot CX-2026-C9", 3.5],
    ["p-1", "allocation", -2, "Allocated to order #LP-948201", 0.8],
  ];
  const out: Movement[] = [];
  for (const [id, type, qty, note, hoursAgo] of entries) {
    const p = by(id);
    if (p) out.unshift(entryFor(type, qty, p, note, at(hoursAgo)));
  }
  return out;
};

const movements = persistentList<Movement>("inventory-movements", seedHistory);

const record = (type: MovementType, qty: number | null, p: Product, note: string, when?: string) => {
  movements.unshift(entryFor(type, qty, p, note, when));
};

export const listMovements = (limit = 8): Movement[] => movements.slice(0, Math.min(Math.max(limit, 1), 50));

// --- Query ---

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

export const parseInventoryQuery = (raw: Record<string, unknown>): InventoryQuery => {
  const page = Number.parseInt(String(raw.page), 10);
  return {
    q: typeof raw.q === "string" ? raw.q.trim().slice(0, 80) : "",
    category: pick(raw.category, ["all", "printers", "copiers", "inks-toner"] as const, "all"),
    warehouse: pick(raw.warehouse, ["all", ...WAREHOUSES] as const, "all"),
    filter: pick<InventoryFilter>(raw.filter, ["all", "healthy", "low", "out", "hold"], "all"),
    sort: pick<InventorySort>(raw.sort, ["urgent", "qtyAsc", "qtyDesc", "value"], "urgent"),
    page: Number.isFinite(page) ? Math.min(100_000, Math.max(1, page)) : 1,
    perPage: Number(pick(String(raw.perPage), ["10", "25", "50"] as const, "10")),
  };
};

const matchesFilter = (i: InventoryItem, f: InventoryFilter) =>
  f === "all" ||
  (f === "healthy" && i.state === "ok") ||
  (f === "low" && i.state === "low") ||
  (f === "out" && i.state === "out") ||
  (f === "hold" && i.testHold);

export const queryInventory = (query: InventoryQuery): InventoryResponse => {
  const needle = query.q.toLowerCase();
  const items = allProducts().map(toItem);

  // Tab counts follow the search, category and warehouse filters, but not the tab itself.
  const base = items.filter(
    (i) =>
      (!needle || [i.name, i.sku, i.ean, i.serial, i.bin].join(" ").toLowerCase().includes(needle)) &&
      (query.category === "all" || i.category === query.category) &&
      (query.warehouse === "all" || i.warehouse === query.warehouse),
  );

  const counts: Record<InventoryFilter, number> = {
    all: base.length,
    healthy: base.filter((i) => matchesFilter(i, "healthy")).length,
    low: base.filter((i) => matchesFilter(i, "low")).length,
    out: base.filter((i) => matchesFilter(i, "out")).length,
    hold: base.filter((i) => matchesFilter(i, "hold")).length,
  };

  const filtered = base.filter((i) => matchesFilter(i, query.filter));
  const order: Record<InventorySort, (a: InventoryItem, b: InventoryItem) => number> = {
    urgent: (a, b) => a.available / Math.max(a.min, 1) - b.available / Math.max(b.min, 1),
    qtyAsc: (a, b) => a.stock - b.stock,
    qtyDesc: (a, b) => b.stock - a.stock,
    value: (a, b) => b.price * b.stock - a.price * a.stock,
  };
  const sorted = [...filtered].sort(order[query.sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / query.perPage));
  const page = Math.min(query.page, pageCount);

  const out = items.filter((i) => i.state === "out");
  return {
    rows: sorted.slice((page - 1) * query.perPage, page * query.perPage),
    total: sorted.length,
    counts,
    kpis: {
      valuation: Math.round(items.reduce((sum, i) => sum + i.price * i.stock, 0)),
      units: items.reduce((sum, i) => sum + i.stock, 0),
      skus: items.length,
      healthyPct: items.length ? (items.filter((i) => i.state === "ok").length / items.length) * 100 : 0,
      low: items.filter((i) => i.state === "low").length,
      out: out.length,
      reorderValue: Math.round(out.reduce((sum, i) => sum + i.price * i.min, 0)),
    },
  };
};

// --- Changes ---

const MAX_STOCK = 100_000;

const reasonOf = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 200) : "");
const whole = (v: unknown) => (Number.isInteger(Number(v)) ? Number(v) : NaN);

export type ChangeResult = { ok: true; item: InventoryItem } | { ok: false; status: 400 | 404 | 409; message: string };

export const adjustStock = (body: unknown): ChangeResult => {
  const b = (body ?? {}) as Partial<AdjustInput>;
  const p = typeof b.productId === "string" ? findProduct(b.productId) : undefined;
  if (!p) return { ok: false, status: 404, message: "Product not found" };

  const mode = b.mode === "set" ? "set" : "delta";
  const qty = whole(b.qty);
  const reason = reasonOf(b.reason);
  if (Number.isNaN(qty) || !reason) return { ok: false, status: 400, message: "Invalid adjustment" };

  const next = mode === "set" ? qty : p.stock + qty;
  if (next < 0 || next > MAX_STOCK) return { ok: false, status: 409, message: "Stock can't go below zero or above the limit" };
  if (next === p.stock) return { ok: false, status: 400, message: "No change" };

  const change = next - p.stock;
  updateProduct(p.id, { stock: next });
  record("adjustment", change, p, reason);
  return { ok: true, item: toItem(p) };
};

export const receiveConsignment = (body: unknown): ChangeResult => {
  const b = (body ?? {}) as Partial<ReceiveInput>;
  const p = typeof b.productId === "string" ? findProduct(b.productId) : undefined;
  if (!p) return { ok: false, status: 404, message: "Product not found" };

  const qty = whole(b.qty);
  const reference = reasonOf(b.reference);
  if (!(qty >= 1 && qty <= MAX_STOCK) || !reference || p.stock + qty > MAX_STOCK)
    return { ok: false, status: 400, message: "Invalid delivery" };

  updateProduct(p.id, { stock: p.stock + qty });
  record("inbound", qty, p, `Received delivery ${reference}`);
  return { ok: true, item: toItem(p) };
};

export const transferItem = (body: unknown): ChangeResult => {
  const b = (body ?? {}) as Partial<TransferInput>;
  const p = typeof b.productId === "string" ? findProduct(b.productId) : undefined;
  if (!p) return { ok: false, status: 404, message: "Product not found" };
  if (!WAREHOUSES.includes(b.warehouse as Warehouse)) return { ok: false, status: 400, message: "Invalid warehouse" };

  const from = locate(p);
  if (from.warehouse === b.warehouse) return { ok: false, status: 400, message: "Already in that warehouse" };

  place(p.id, { warehouse: b.warehouse as Warehouse, bin: `${BIN_PREFIX[p.category]}-${String((numberOf(p.id) % 9) + 1).padStart(2, "0")}` });
  record("transfer", null, p, `Moved from ${from.warehouse} to ${b.warehouse}`);
  return { ok: true, item: toItem(p) };
};

export const pickerSearch = (q: string): InventoryItem[] => {
  const needle = q.trim().toLowerCase().slice(0, 80);
  if (!needle) return allProducts().slice(0, 6).map(toItem);
  return allProducts()
    .filter((p) => [p.name, p.sku, p.ean].join(" ").toLowerCase().includes(needle))
    .slice(0, 6)
    .map(toItem);
};

// --- Add, edit and delete an item ---

export type ItemResult = ChangeResult;

const validateItem = (body: unknown): (ItemInput & { status: Product["status"] }) | null => {
  const b = (body ?? {}) as Record<string, unknown>;
  const base = validateProductInput({ ...b, status: typeof b.status === "string" ? b.status : "active" });
  const bin = typeof b.bin === "string" ? b.bin.trim().toUpperCase() : "";
  if (!base || !WAREHOUSES.includes(b.warehouse as Warehouse) || !/^[A-Z0-9][A-Z0-9-]{1,19}$/.test(bin)) return null;
  return { ...base, warehouse: b.warehouse as Warehouse, bin };
};

export const createItem = (body: unknown): ItemResult => {
  const input = validateItem(body);
  if (!input) return { ok: false, status: 400, message: "Invalid item" };
  if (skuExists(input.sku)) return { ok: false, status: 409, message: "SKU already exists" };

  const { warehouse, bin, ...product } = input;
  const created = createProduct(product);
  place(created.id, { warehouse, bin });
  if (created.stock > 0) record("inbound", created.stock, created, "Initial stock booked when the item was added");
  return { ok: true, item: toItem(created) };
};

export const updateItem = (id: string, body: unknown): ItemResult => {
  const p = findProduct(id);
  if (!p) return { ok: false, status: 404, message: "Item not found" };
  const input = validateItem({ status: p.status, ...(body as object) });
  if (!input) return { ok: false, status: 400, message: "Invalid item" };
  if (skuExists(input.sku, id)) return { ok: false, status: 409, message: "SKU already exists" };

  const before = { stock: p.stock, ...locate(p) };
  const { warehouse, bin, ...fields } = input;
  updateProduct(id, fields);
  place(id, { warehouse, bin });

  if (fields.stock !== before.stock)
    record("adjustment", fields.stock - before.stock, p, "Stock corrected when the item was edited");
  if (warehouse !== before.warehouse || bin !== before.bin)
    record("transfer", null, p, `Moved from ${before.warehouse} ${before.bin} to ${warehouse} ${bin}`);
  return { ok: true, item: toItem(p) };
};

export const deleteItem = (id: string): { ok: boolean } => {
  const p = findProduct(id);
  if (!p) return { ok: false };
  record("adjustment", p.stock ? -p.stock : null, p, "Removed from the register");
  deleteProducts([id]);
  unplace(id);
  return { ok: true };
};
