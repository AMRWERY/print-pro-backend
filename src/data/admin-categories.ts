import type {
  CategoriesResponse,
  Category,
  CategoryInput,
  CategoryKind,
  CategorySort,
  CategoryVisibility,
} from "~/types/admin/categories";
import { persistentList, persistentValue } from "~/db/persist";
import { allProducts } from "~/data/admin-products";
import { couponCountUsing } from "~/data/admin-coupons";

// The categories: three built-ins to start with, then whatever the admin adds. Persisted in SQLite
// (see ~/db/persist). The list is flat. Products, coupons and the storefront refer to a category by `key`.

const BUILT_IN: { key: string; kind: CategoryKind; name: string; icon: string }[] = [
  { key: "printers", kind: "printer", name: "Printers", icon: "lucide:printer" },
  { key: "copiers", kind: "copier", name: "Photocopiers", icon: "lucide:copy" },
  { key: "inks-toner", kind: "supply", name: "Inks & Toner", icon: "lucide:droplets" },
];

const RESERVED_KEYS = ["new", "admin", "api", "search"];

/** A key from the Latin letters and digits of a name; `category-N` when there are none (an Arabic name, say). Always unique in `taken`. */
export const slugKey = (name: string, taken: ReadonlySet<string>): string => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  let key = base && !RESERVED_KEYS.includes(base) ? base : "";
  if (!key) {
    for (let n = 1; ; n++) if (!taken.has(`category-${n}`)) return `category-${n}`;
  }
  for (let n = 2; taken.has(key); n++) key = `${base}-${n}`;
  return key;
};

/**
 * Brings stored categories up to the current shape: every row gets a key and a kind, nothing is nested,
 * and on first run (or when rows from the older shape are found) the built-ins that are missing are added.
 * The admin's own edits (names, order, visibility) are kept.
 */
export const migrateCategories = (rows: Category[]): Category[] => {
  const legacy = rows.some((r) => !r.key);
  const taken = new Set(rows.flatMap((r) => (r.key ? [r.key] : [])));
  const out: Category[] = rows.map((r) => {
    if (r.key && r.kind && r.parentId === null) return r;
    const last = String(r.slug ?? "").split("/").filter(Boolean).pop() ?? r.name;
    const key = r.key || slugKey(last, taken);
    taken.add(key);
    const kind = r.kind ?? BUILT_IN.find((b) => b.key === key)?.kind ?? "general";
    return { ...r, key, kind, parentId: null };
  });
  if (!rows.length || legacy) {
    for (const b of BUILT_IN) {
      if (out.some((c) => c.key === b.key)) continue;
      out.push({
        id: `c-${b.key}`,
        key: b.key,
        kind: b.kind,
        code: `CAT-${b.key.replace(/[^a-z]/g, "").slice(0, 3).toUpperCase()}-01`,
        name: b.name,
        slug: `/${b.key}`,
        parentId: null,
        order: out.length,
        skus: 0,
        visibility: "active",
        abstract: "",
        icon: b.icon,
        megamenu: true,
        publicIndexing: true,
        facetRank: 3,
        defaultSort: "curated",
      });
    }
  }
  return out;
};

const store = persistentList<Category>("categories", () => migrateCategories([]));
{
  const migrated = migrateCategories(store);
  if (migrated.length !== store.length || migrated.some((c, i) => c !== store[i])) store.splice(0, store.length, ...migrated);
}
const seq = persistentValue("categories.seq", () => 100);

// --- The registry the rest of the API asks: what is this category called, what icon, what kind? ---

export const categoryKeys = (): string[] => store.map((c) => c.key);
export const categoryByKey = (key: string): Category | undefined => store.find((c) => c.key === key);
/** The category's name, or the raw key when it no longer exists. */
export const categoryLabel = (key: string): string => categoryByKey(key)?.name ?? key;
export const categoryIcon = (key: string): string => categoryByKey(key)?.icon ?? "lucide:package";
export const kindOf = (key: string): CategoryKind => categoryByKey(key)?.kind ?? "general";
/** A `category` query value: "all" or the key of an existing category; anything else means "all". */
export const parseCategoryFilter = (value: unknown): string =>
  typeof value === "string" && (value === "all" || categoryByKey(value)) ? value : "all";

/** Categories a visitor may see, in their order. */
export const visibleCategories = (): Category[] =>
  store.filter((c) => c.visibility === "active").sort((a, b) => a.order - b.order);

export const productCountOf = (key: string): number => allProducts().filter((p) => p.category === key).length;

const siblings = (parentId: string | null) =>
  store
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.order - b.order);

export const listCategories = (): CategoriesResponse => {
  const nodes = [...store].sort((a, b) => a.order - b.order).map((c) => ({ ...c, skus: productCountOf(c.key) }));
  const roots = nodes.filter((c) => c.parentId === null);
  return {
    nodes,
    kpis: {
      masters: roots.length,
      children: nodes.length - roots.length,
      skus: roots.reduce((sum, c) => sum + c.skus, 0),
      unpublished: store.filter((c) => c.visibility !== "active").length,
    },
  };
};

const pick = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;

const slugOf = (v: unknown) =>
  `/${String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9/-]+/g, "-")
    .split("/")
    .map((s) => s.replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .join("/")}`.slice(0, 120);

/** Trims and clamps the browser's input. Returns null when something required is wrong. */
export const validateCategory = (body: unknown): CategoryInput | null => {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const slug = slugOf(b.slug);
  const facetRank = Number(b.facetRank);
  if (name.length < 2 || name.length > 80 || slug === "/") return null;
  return {
    name,
    slug,
    key: typeof b.key === "string" && b.key.trim() ? b.key.trim() : undefined,
    kind: pick<CategoryKind>(b.kind, ["printer", "copier", "supply", "general"], "general"),
    parentId: null, // the list is flat
    visibility: pick<CategoryVisibility>(
      b.visibility,
      ["active", "staging", "hidden"],
      "active",
    ),
    abstract:
      typeof b.abstract === "string" ? b.abstract.trim().slice(0, 400) : "",
    megamenu: b.megamenu === true,
    publicIndexing: b.publicIndexing === true,
    facetRank: Number.isInteger(facetRank)
      ? Math.min(5, Math.max(1, facetRank))
      : 3,
    defaultSort: pick<CategorySort>(
      b.defaultSort,
      ["curated", "newest", "priceAsc", "priceDesc"],
      "curated",
    ),
  };
};

/** What is wrong with a key typed on create, or null. 400 for the wrong shape, 409 when it is taken. */
export const keyProblem = (raw: string | undefined): { status: 400 | 409; message: string } | null => {
  if (raw === undefined) return null;
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(raw) || RESERVED_KEYS.includes(raw))
    return { status: 400, message: "Use 2 to 40 lowercase letters, numbers or dashes, and not a reserved word." };
  if (store.some((c) => c.key === raw)) return { status: 409, message: "Another category already uses this key." };
  return null;
};

/** The reason a category cannot be deleted yet, or null. */
export const deleteBlocker = (id: string): string | null => {
  const category = store.find((c) => c.id === id);
  if (!category) return null;
  const products = productCountOf(category.key);
  if (products) return `${products} products use this category. Move them first.`;
  const coupons = couponCountUsing(category.key);
  return coupons ? `${coupons} coupons use this category. Remove it from them first.` : null;
};

export type CategoryCheck = "ok" | "slug" | "parent";

/** Slug must be unique; the parent must be a master category (the tree is two levels deep). */
export const checkCategory = (
  input: CategoryInput,
  selfId?: string,
): CategoryCheck => {
  if (store.some((c) => c.slug === input.slug && c.id !== selfId))
    return "slug";
  if (input.parentId) {
    const parent = store.find((c) => c.id === input.parentId);
    if (!parent || parent.parentId !== null || input.parentId === selfId)
      return "parent";
    // A category that already has children can't become a child itself.
    if (selfId && store.some((c) => c.parentId === selfId)) return "parent";
  }
  return "ok";
};

const codeFor = (input: CategoryInput, id: string) => {
  const parent = input.parentId
    ? store.find((c) => c.id === input.parentId)
    : null;
  return parent
    ? `${parent.code}-${String.fromCharCode(65 + siblings(parent.id).length)}`
    : `CAT-${
        input.name
          .replace(/[^A-Za-z]/g, "")
          .slice(0, 3)
          .toUpperCase() || "NEW"
      }-${id.slice(2).padStart(2, "0")}`;
};

export const createCategory = (input: CategoryInput): Category => {
  const id = `c-${++seq.value}`;
  const parent = input.parentId
    ? store.find((c) => c.id === input.parentId)
    : null;
  const category: Category = {
    ...input,
    id,
    key: input.key ?? slugKey(input.name, new Set(store.map((c) => c.key))),
    kind: input.kind ?? "general",
    code: codeFor(input, id),
    order: siblings(input.parentId).length,
    skus: 0,
    icon: "lucide:package",
  };
  store.push(category);
  return category;
};

export const updateCategory = (
  id: string,
  input: CategoryInput,
): Category | null => {
  const category = store.find((c) => c.id === id);
  if (!category) return null;
  const { key: _key, kind: _kind, ...editable } = input;
  Object.assign(category, editable);
  return category;
};

/** Deletes a category and, with it, every sub-category under it. */
export const deleteCategory = (id: string): number => {
  const gone = new Set([
    id,
    ...store.filter((c) => c.parentId === id).map((c) => c.id),
  ]);
  const before = store.length;
  for (let i = store.length - 1; i >= 0; i--)
    if (gone.has(store[i]!.id)) store.splice(i, 1);
  return before - store.length;
};

/** Sets the order of one sibling group. `ids` must be exactly the members of that group. */
export const reorderCategories = (
  parentId: string | null,
  ids: string[],
): boolean => {
  const group = siblings(parentId);
  if (ids.length !== group.length || !group.every((c) => ids.includes(c.id)))
    return false;
  ids.forEach((id, order) => {
    store.find((c) => c.id === id)!.order = order;
  });
  return true;
};

export const findCategory = (id: string) => store.find((c) => c.id === id);