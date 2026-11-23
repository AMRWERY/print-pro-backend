import type {
  Packaging,
  Product,
  ProductDetail,
  ProductExtras,
  ProductFormValues,
  ProductMedia,
  ProductRevision,
  ProductSpec,
  Publication,
  ProductCategory,
  ProductInput,
  ProductSort,
  ProductStatus,
  ProductsQuery,
  ProductsResponse,
  StockFilter
} from "~/types/admin/products";
import { createHash } from "node:crypto";
import { stockStateOf } from "~/data/product-meta";
import { categoryIcon, categoryKeys, categoryLabel, kindOf, parseCategoryFilter } from "~/data/admin-categories";
import type { CategoryKind } from "~/types/admin/categories";
import { persistentList, persistentValue } from "~/db/persist";

// The product register: starts empty, filled from the admin Products screen. Products, editor extras, revisions
// and the id counter are persisted in SQLite (see ~/db/persist).



const store = persistentList<Product>("products", () => []);

const seq = persistentValue("products.seq", () => 0);

export const productBrands = () => [...new Set(store.map((p) => p.brand))].sort();

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;

export const parseProductsQuery = (raw: Record<string, unknown>): ProductsQuery => {
  const page = Number.parseInt(String(raw.page), 10);
  return {
    q: typeof raw.q === "string" ? raw.q.trim().slice(0, 80) : "",
    category: parseCategoryFilter(raw.category),
    brand: typeof raw.brand === "string" && raw.brand.length < 80 ? raw.brand : "all",
    stock: pick<StockFilter>(raw.stock, ["all", "ok", "low", "out", "depleted"], "all"),
    status: pick(raw.status, ["all", "active", "testing", "hold", "draft"] as const, "all"),
    sort: pick<ProductSort>(raw.sort, ["newest", "name", "priceHigh", "priceLow", "stockLow"], "newest"),
    page: Number.isFinite(page) ? Math.min(100_000, Math.max(1, page)) : 1,
    perPage: Number(pick(String(raw.perPage), ["10", "25", "50"] as const, "10")),
  };
};

export const queryProducts = (query: ProductsQuery): ProductsResponse => {
  const needle = query.q.toLowerCase();

  const filtered = store.filter(
    (p) =>
      (!needle || [p.name, p.sku, p.serial, p.brand, p.spec].join(" ").toLowerCase().includes(needle)) &&
      (query.category === "all" || p.category === query.category) &&
      (query.brand === "all" || p.brand === query.brand) &&
      (query.stock === "all" ||
        (query.stock === "depleted"
          ? stockStateOf(p) !== "ok"
          : stockStateOf(p) === query.stock)) &&
      (query.status === "all" || p.status === query.status),
  );

  const sorted = [...filtered];
  const order: Record<ProductSort, ((a: Product, b: Product) => number) | null> = {
    newest: null,
    name: (a, b) => a.name.localeCompare(b.name),
    priceHigh: (a, b) => b.price - a.price,
    priceLow: (a, b) => a.price - b.price,
    stockLow: (a, b) => a.stock / a.min - b.stock / b.min,
  };
  const cmp = order[query.sort];
  if (cmp) sorted.sort(cmp);

  const pageCount = Math.max(1, Math.ceil(sorted.length / query.perPage));
  const page = Math.min(query.page, pageCount);

  const depleted = store.filter((p) => stockStateOf(p) !== "ok").length;

  return {
    rows: sorted.slice((page - 1) * query.perPage, page * query.perPage).map(withCover),
    total: sorted.length,
    brands: productBrands(),
    kpis: {
      registered: store.length,
      indexedThisCycle: seq.value,
      valuation: Math.round(store.reduce((sum, p) => sum + p.price * p.stock, 0)),
      depleted,
      testing: store.filter((p) => p.status === "testing").length,
      hold: store.filter((p) => p.status === "hold").length,
    },
    presets: {
      a3Copiers: store.filter((p) => kindOf(p.category) === "copier" && p.spec.startsWith("A3")).length,
      supplies: store.filter((p) => kindOf(p.category) === "supply").length,
      depleted,
    },
  };
};

/** What is wrong with a product's basic details, by field name. Empty when it is fine. */
export const productProblems = (body: unknown): Record<string, string> => {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const sku = typeof b.sku === "string" ? b.sku.trim().toUpperCase() : "";
  const brand = typeof b.brand === "string" ? b.brand.trim() : "";
  const price = Number(b.price);
  const stock = Number(b.stock);
  const min = Number(b.min);
  const problems: Record<string, string> = {};
  if (typeof b.category !== "string" || !categoryKeys().includes(b.category)) problems.category = "Choose a category.";
  if (name.length < 2 || name.length > 120) problems.name = "Enter a product title of 2 to 120 characters.";
  if (!/^[A-Z0-9][A-Z0-9-]{2,30}$/.test(sku))
    problems.sku = "Use 3 to 31 letters, numbers or dashes, with no spaces (for example PRN-300).";
  if (brand.length < 2 || brand.length > 60) problems.brand = "Enter a brand of 2 to 60 characters.";
  if (b.price === null || b.price === "" || !(price >= 0 && price <= 1_000_000))
    problems.price = "Enter a price between 0 and 1,000,000.";
  if (!Number.isInteger(stock) || stock < 0 || stock > 100_000)
    problems.stock = "Enter a whole number from 0 to 100,000.";
  if (!Number.isInteger(min) || min < 0 || min > 100_000)
    problems.min = "Enter a whole number from 0 to 100,000.";
  return problems;
};

export const validateProductInput = (body: unknown): ProductInput | null => {
  if (Object.keys(productProblems(body)).length) return null;
  const b = (body ?? {}) as Record<string, unknown>;
  const category = String(b.category);
  const status = pick<ProductStatus>(b.status, ["active", "testing", "hold", "draft"], "active");
  return {
    name: String(b.name).trim(),
    sku: String(b.sku).trim().toUpperCase(),
    category,
    brand: String(b.brand).trim(),
    price: Number(b.price),
    stock: Number(b.stock),
    min: Number(b.min),
    status,
  };
};

/** The first stored picture of a product: its cover. */
const coverOf = (id: string) => extrasStore.get(id)?.media?.find((m) => m.url)?.url;

/** The cover photo's data URL, for the admin image route. */
export const coverData = (id: string) => (findProduct(id) ? coverOf(id) : undefined);

/** Adds the address of the cover photo to a row. It changes when the photo does, so browsers can keep it. */
const withCover = (p: Product): Product => {
  const url = coverOf(p.id);
  return url
    ? { ...p, cover: `/api/admin/products/${p.id}/cover?v=${createHash("md5").update(url).digest("hex").slice(0, 8)}` }
    : p;
};

export const skuExists = (sku: string, exceptId?: string) =>
  store.some((p) => p.sku === sku && p.id !== exceptId);

export const createProduct = (input: ProductInput): Product => {
  const n = seq.value++;
  const product: Product = {
    id: `p-${n}`,
    tag: "NEW",
    spec: categoryLabel(input.category),
    serial: `S/N: ${input.sku}`,
    unit: "unit",
    icon: categoryIcon(input.category),
    ...input,
  };
  store.unshift(product);
  return product;
};

export const updateProduct = (id: string, patch: Partial<ProductInput>): Product | null => {
  const product = store.find((p) => p.id === id);
  if (!product) return null;
  Object.assign(product, patch);
  if (patch.category) product.icon = categoryIcon(patch.category);
  return product;
};

export const deleteProducts = (ids: string[]): number => {
  const gone = new Set(ids);
  const before = store.length;
  for (let i = store.length - 1; i >= 0; i--) if (gone.has(store[i]!.id)) store.splice(i, 1);
  for (const id of gone) {
    extrasStore.delete(id);
    revisionStore.delete(id);
  }
  return before - store.length;
};

export const findProduct = (id: string) => store.find((p) => p.id === id);

// ---------------------------------------------------------------------------
// Product editor
// ---------------------------------------------------------------------------

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const HS_CODES: Record<CategoryKind, string> = {
  general: "",
  printer: "8443.32.10",
  copier: "8443.31.00",
  supply: "3215.90.00",
};

const SPECS: Record<CategoryKind, [string, string][]> = {
  general: [],
  printer: [["Technology", "Inkjet or laser"], ["Colour", "Colour or black & white"], ["Largest paper size", "A4 to A0"], ["Connectivity", "Wi-Fi, Ethernet, USB"]],
  copier: [["Speed", "20 to 75 pages per minute"], ["Paper size", "A4 or A3"], ["Functions", "Copy, print, scan, fax"], ["Automatic duplex", "Yes"]],
  supply: [["Type", "Ink, toner or drum unit"], ["Colour", "Black, colour or set"], ["Yield", "Rated pages at 5% coverage"], ["Compatible models", "See the product page"]],
};

const defaultExtras = (p: Product): ProductExtras => {
  return {
    slug: slugify(p.name),
    description: `The ${p.name} sets the standard in its class. ${p.spec}.\n\nEvery unit is tested before dispatch and ships with its test print and warranty card.`,
    media: [],
    compareAt: Math.round(p.price * 1.08),
    cost: Math.round(p.price * 0.62),
    taxExempt: false,
    specs: SPECS[kindOf(p.category)].map(([key, value]) => ({ key, value })),
    massKg: 2.4,
    dims: { l: 148, w: 182, h: 7 },
    hsCode: HS_CODES[kindOf(p.category)],
    packaging: "pallet",
    publication: p.status === "draft" ? "draft" : "published",
    channels: ["storefront", "business"],
    subType: categoryLabel(p.category),
    collections: ["Office printing 2026"],
    tags: [`#${slugify(p.brand).replace(/-/g, "")}`],
    bundled: [],
  };
};

/** A Map-like view over a persisted list of { id, value } documents. */
const persistentMap = <V>(name: string) => {
  const list = persistentList<{ id: string; value: V }>(name, () => []);
  return {
    get: (id: string) => list.find((d) => d.id === id)?.value,
    set: (id: string, value: V) => {
      const doc = list.find((d) => d.id === id);
      if (doc) doc.value = value;
      else list.push({ id, value });
    },
    delete: (id: string) => {
      const i = list.findIndex((d) => d.id === id);
      if (i >= 0) list.splice(i, 1);
    },
  };
};

const extrasStore = persistentMap<ProductExtras>("product-extras");
const revisionStore = persistentMap<ProductRevision[]>("product-revisions");

export const getProductDetail = (id: string): ProductDetail | null => {
  const p = findProduct(id);
  if (!p) return null;
  return {
    ...p,
    ...(extrasStore.get(id) ?? defaultExtras(p)),
    revisions: revisionStore.get(id) ?? [
      { rev: "1.0", at: "2026-10-01T09:00:00.000Z", by: "System", note: "Registered in the catalog" },
    ],
  };
};

// -- Validation: trims, clamps and filters rather than trusting the browser --

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strList = (v: unknown, maxItems: number, maxLen: number) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, maxLen)).filter(Boolean).slice(0, maxItems) : [];
const numOrNull = (v: unknown, max = 1_000_000) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
};

/** A product picture: a small image sent as a data URL. Anything else is dropped. */
const MAX_IMAGE_CHARS = 260_000;
const imageUrl = (v: unknown) =>
  typeof v === "string" && v.length <= MAX_IMAGE_CHARS && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : "";

export const CHANNELS = ["storefront", "business", "printLab", "depot", "wholesale"] as const;

export const validateProductForm = (body: unknown): ProductFormValues | null => {
  const base = validateProductInput(body);
  if (!base) return null;
  const b = (body ?? {}) as Record<string, any>;
  const dims = (b.dims ?? {}) as Record<string, unknown>;

  return {
    ...base,
    slug: slugify(str(b.slug, 120)) || slugify(base.name),
    description: str(b.description, 4000),
    media: (Array.isArray(b.media) ? b.media : [])
      .slice(0, 12)
      .map((m: any) => ({ name: str(m?.name, 120), size: numOrNull(m?.size, 2e9) ?? 0, url: imageUrl(m?.url) }))
      .filter((m: ProductMedia) => m.name),
    compareAt: numOrNull(b.compareAt),
    cost: numOrNull(b.cost),
    taxExempt: b.taxExempt === true,
    specs: (Array.isArray(b.specs) ? b.specs : [])
      .slice(0, 30)
      .map((s: any) => ({ key: str(s?.key, 60), value: str(s?.value, 200) }))
      .filter((s: ProductSpec) => s.key && s.value),
    massKg: numOrNull(b.massKg, 100_000),
    dims: { l: numOrNull(dims.l, 100_000), w: numOrNull(dims.w, 100_000), h: numOrNull(dims.h, 100_000) },
    hsCode: str(b.hsCode, 20),
    packaging: pick<Packaging>(b.packaging, ["pallet", "standard"], "pallet"),
    publication: pick<Publication>(b.publication, ["draft", "published", "archived"], "draft"),
    channels: strList(b.channels, 5, 20).filter((c) => (CHANNELS as readonly string[]).includes(c)),
    subType: str(b.subType, 80),
    collections: strList(b.collections, 10, 60),
    tags: strList(b.tags, 15, 40),
    bundled: strList(b.bundled, 20, 40).filter((id) => store.some((p) => p.id === id)),
  };
};

const nextRevision = (id: string) => {
  const list = revisionStore.get(id) ?? [{ rev: "1.0", at: "2026-10-01T09:00:00.000Z", by: "System", note: "Registered in the catalog" }];
  const [major, minor] = list[0]!.rev.split(".").map(Number);
  return `${major}.${(minor ?? 0) + 1}`;
};

const pushRevision = (id: string, note: string) => {
  const list = revisionStore.get(id) ?? [{ rev: "1.0", at: "2026-10-01T09:00:00.000Z", by: "System", note: "Registered in the catalog" }];
  revisionStore.set(id, [
    { rev: nextRevision(id), at: new Date().toISOString(), by: "Admin", note },
    ...list,
  ]);
};

const splitForm = (v: ProductFormValues) => {
  const { name, sku, category, brand, price, stock, min, status, ...extras } = v;
  return { base: { name, sku, category, brand, price, stock, min, status } as ProductInput, extras: extras as ProductExtras };
};

/** The product link has to be unique: a second product with the same title becomes name-2, name-3… */
const uniqueSlug = (slug: string, exceptId?: string) => {
  const taken = new Set(store.filter((p) => p.id !== exceptId).map((p) => extrasStore.get(p.id)?.slug ?? slugify(p.name)));
  let candidate = slug;
  for (let n = 2; taken.has(candidate); n++) candidate = `${slug}-${n}`;
  return candidate;
};

export const createProductFromForm = (values: ProductFormValues): Product => {
  const { base, extras } = splitForm(values);
  const product = createProduct(base);
  extras.slug = uniqueSlug(extras.slug, product.id);
  extrasStore.set(product.id, extras);
  pushRevision(product.id, "Registered from the product editor");
  return product;
};

export const updateProductFromForm = (id: string, values: ProductFormValues): Product | null => {
  const { base, extras } = splitForm(values);
  const product = updateProduct(id, base);
  if (!product) return null;
  extras.slug = uniqueSlug(extras.slug, id);
  extrasStore.set(id, extras);
  pushRevision(id, values.publication === "published" ? "Published from the product editor" : "Saved from the product editor");
  return product;
};

/** The whole register, for the inventory ledger to read and summarise. */
export const allProducts = () => store;

/** The extras an admin explicitly saved from the product editor; undefined for products never edited there. */
export const savedExtras = (id: string) => extrasStore.get(id);
