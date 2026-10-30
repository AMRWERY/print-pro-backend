import type {
  CategoriesResponse,
  Category,
  CategoryInput,
  CategorySort,
  CategoryVisibility,
} from "~/types/admin/categories";
import { persistentList, persistentValue } from "~/db/persist";

// Demo taxonomy for the categories screen, seeded on first run and persisted in SQLite
// (see ~/db/persist).

type Seed = Pick<Category, "name" | "slug" | "skus"> &
  Partial<Pick<Category, "visibility" | "abstract">>;

const masters: (Seed & { icon: string; code: string; children: Seed[] })[] = [
  {
    code: "CAT-PRN-01",
    icon: "lucide:printer",
    name: "Printers",
    slug: "/printers",
    skus: 1552,
    abstract:
      "Inkjet, laser and large-format printers for the home, the office and the print room.",
    children: [
      {
        name: "Inkjet & Ink-Tank Printers",
        slug: "/printers/inkjet",
        skus: 640,
      },
      {
        name: "Laser Printers",
        slug: "/printers/laser",
        skus: 520,
      },
      {
        name: "Large-Format Plotters",
        slug: "/printers/large-format",
        skus: 252,
      },
      {
        name: "Portable Printers",
        slug: "/printers/portable",
        skus: 140,
      },
    ],
  },
  {
    code: "CAT-CPY-02",
    icon: "lucide:copy",
    name: "Photocopiers",
    slug: "/photocopiers",
    skus: 1396,
    abstract:
      "A4 and A3 multifunction photocopiers, from small-office machines to production systems.",
    children: [
      {
        name: "A4 Multifunction",
        slug: "/photocopiers/a4-multifunction",
        skus: 380,
      },
      {
        name: "A3 Mono Copiers",
        slug: "/photocopiers/a3-mono",
        skus: 430,
      },
      {
        name: "A3 Colour Copiers",
        slug: "/photocopiers/a3-colour",
        skus: 380,
      },
      {
        name: "Production Systems",
        slug: "/photocopiers/production",
        skus: 206,
      },
    ],
  },
  {
    code: "CAT-INK-03",
    icon: "lucide:droplets",
    name: "Inks & Toner",
    slug: "/inks-toner",
    skus: 1864,
    abstract:
      "Genuine ink, toner and drum units, matched to your printer or photocopier model.",
    children: [
      {
        name: "Ink Bottles & Cartridges",
        slug: "/inks-toner/ink",
        skus: 560,
      },
      {
        name: "Toner Cartridges",
        slug: "/inks-toner/toner",
        skus: 720,
      },
      {
        name: "Drum Units",
        slug: "/inks-toner/drums",
        skus: 233,
      },
      {
        name: "Multi-Colour Sets",
        slug: "/inks-toner/sets",
        skus: 351,
      },
    ],
  },
];

const seed = (): Category[] => {
  const out: Category[] = [];
  masters.forEach((m, mi) => {
    const id = `c-${mi + 1}`;
    out.push({
      id,
      code: m.code,
      name: m.name,
      slug: m.slug,
      parentId: null,
      order: mi,
      skus: m.skus,
      visibility: m.visibility ?? "active",
      abstract: m.abstract ?? "",
      icon: m.icon,
      megamenu: true,
      publicIndexing: (m.visibility ?? "active") === "active",
      facetRank: Math.min(5, mi + 1),
      defaultSort: "curated",
    });
    m.children.forEach((c, ci) =>
      out.push({
        id: `${id}-${ci + 1}`,
        code: `${m.code}-${String.fromCharCode(65 + ci)}`,
        name: c.name,
        slug: c.slug,
        parentId: id,
        order: ci,
        skus: c.skus,
        visibility: c.visibility ?? "active",
        abstract: "",
        icon: m.icon,
        megamenu: false,
        publicIndexing: (c.visibility ?? "active") === "active",
        facetRank: 3,
        defaultSort: "curated",
      }),
    );
  });
  return out;
};

const store = persistentList<Category>("categories", seed);
const seq = persistentValue("categories.seq", () => 100);

const siblings = (parentId: string | null) =>
  store
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.order - b.order);

export const listCategories = (): CategoriesResponse => {
  const roots = store.filter((c) => c.parentId === null);
  return {
    nodes: [...store].sort((a, b) => a.order - b.order),
    kpis: {
      masters: roots.length,
      children: store.length - roots.length,
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
    parentId: typeof b.parentId === "string" && b.parentId ? b.parentId : null,
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
    code: codeFor(input, id),
    order: siblings(input.parentId).length,
    skus: 0,
    icon: parent?.icon ?? "lucide:folder-tree",
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
  const moved = category.parentId !== input.parentId;
  Object.assign(category, input);
  if (moved) {
    category.order = siblings(input.parentId).filter((c) => c.id !== id).length;
  }
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