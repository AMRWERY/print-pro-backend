import { persistentList, persistentValue } from "~/db/persist";
import type {
  BlockInput,
  BlockKind,
  BlockPalette,
  BlockQuery,
  BlockRow,
  BlockState,
  BlockStatus,
  BlockStatusFilter,
  BlockTab,
  BlocksResponse,
  ContentBlock,
} from "~/types/admin/content";

// Demo content book. When the app has a backend this file goes away and
// server/api/admin/content/* proxies the real service.

/** The book has a fixed "today" so states and expiry are stable between reloads. */
const TODAY = "2026-10-31";
const DAY = 86_400_000;
const addDays = (days: number) =>
  new Date(Date.parse(TODAY) + days * DAY).toISOString().slice(0, 10);

export const SLOT_CAP = 24;
const BASELINE_CTR = 7.1;

type Seed = Omit<ContentBlock, "id" | "updatedAt" | "status" | "imageUrl"> & {
  status?: BlockStatus;
};

const seeds: Seed[] = [
  {
    kind: "hero",
    title: "Print, copy and keep going // Kopira Pro A3",
    subtitle:
      "A3 photocopiers delivered, installed and covered by a maintenance contract.",
    ctaLabel: "Shop photocopiers",
    link: "/photocopiers",
    imageAlt: "Kopira Pro A3 photocopier in a bright office",
    palette: "graphite",
    startsAt: addDays(-16),
    endsAt: addDays(30),
    views: 14200,
    clicks: 2018,
  },
  {
    kind: "hero",
    title: "Genuine Ink and Toner, Matched to Your Machine",
    subtitle:
      "Every supply lists the exact printers and photocopiers it fits.",
    ctaLabel: "Shop ink and toner",
    link: "/inks-toner",
    imageAlt: "Boxes of genuine toner cartridges",
    palette: "sand",
    startsAt: addDays(-20),
    endsAt: null,
    views: 8900,
    clicks: 872,
  },
  {
    kind: "product",
    title: "Nordjet Large-Format 44-inch Printer",
    subtitle:
      "Sharp CAD drawings and posters up to A0, with installation included.",
    ctaLabel: "Shop the printer",
    link: "/printers/nordjet-large-format-44",
    imageAlt: "Nordjet 44 inch large-format printer",
    palette: "ocean",
    startsAt: addDays(-60),
    endsAt: null,
    views: 6200,
    clicks: 459,
  },
  {
    kind: "marquee",
    title: "Business and School Procurement Window",
    subtitle:
      "Schools and offices get a 20% account rebate on bulk orders this quarter.",
    ctaLabel: "Request a quote",
    link: "/services/financing",
    imageAlt: "",
    palette: "forest",
    startsAt: addDays(-12),
    endsAt: addDays(45),
    views: 11400,
    clicks: 1277,
  },
  {
    kind: "category",
    title: "Photocopiers for Every Office",
    subtitle:
      "Featured on the homepage grid, dynamic slot #03.",
    ctaLabel: "Shop photocopiers",
    link: "/photocopiers",
    imageAlt: "Row of A3 photocopiers",
    palette: "violet",
    startsAt: null,
    endsAt: null,
    views: 19500,
    clicks: 1326,
  },
  {
    kind: "marquee",
    title: "Winter Toner Sale",
    subtitle:
      "Staged for the cron trigger: toner and ink at seasonal pricing.",
    ctaLabel: "See the offers",
    link: "/inks-toner",
    imageAlt: "Toner cartridges on a shelf",
    palette: "ember",
    startsAt: addDays(15),
    endsAt: addDays(45),
    views: 0,
    clicks: 0,
  },
  {
    kind: "brand",
    title: "Kopira Photocopier Range Showcase",
    subtitle:
      "Unpublished staging sandbox for the brand story, awaiting asset review.",
    ctaLabel: "Discover Kopira",
    link: "/photocopiers/kopira",
    imageAlt: "",
    palette: "graphite",
    startsAt: null,
    endsAt: null,
    status: "draft",
    views: 0,
    clicks: 0,
  },
];

const TITLES: Record<BlockKind, string[]> = {
  hero: [
    "Nordjet Pro A3 Colour Inkjet",
    "Back-to-School Printer Offers",
    "Corex Laser Office Edition",
  ],
  promo: [
    "Free delivery on photocopier orders",
    "Service clinic: book a technician visit",
    "Trade in your old printer, upgrade today",
  ],
  category: [
    "Large-Format Printers",
    "Toner & Drum Units",
    "Ink Bottles & Cartridges",
  ],
  product: [
    "Corex Toner Black 210 High-Yield",
    "Printa Tank 500 Ink-Tank Printer",
    "Kopira Pro A3 35 ppm Photocopier",
  ],
  brand: [
    "Kopira Heritage Story",
    "Nordjet Wide-Format Partner",
    "Corex Genuine Supplies",
  ],
  marquee: [
    "Cairo office expo voucher",
    "Back-in-stock alerts now live",
    "Autumn onboarding credit",
  ],
};
const PALETTES: BlockPalette[] = [
  "ember",
  "ocean",
  "forest",
  "graphite",
  "violet",
  "sand",
];
const KINDS: BlockKind[] = [
  "promo",
  "category",
  "product",
  "brand",
  "hero",
  "marquee",
];

// 11 more blocks spread across kinds: most live, two scheduled, one expired, one draft.
const generated: Seed[] = Array.from({ length: 11 }, (_, k) => {
  const kind = KINDS[k % KINDS.length]!;
  const title = TITLES[kind][Math.floor(k / KINDS.length) % 3]!;
  const views = 1800 + ((k * 3719) % 9000);
  const base: Seed = {
    kind,
    title,
    subtitle: `Homepage ${title.toLowerCase().includes("free") ? "offer" : "feature"} managed by the content team.`,
    ctaLabel: "Learn more",
    link: `/${kind}/${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 28)}`,
    imageAlt: k === 3 || k === 8 ? "" : `${title} artwork`,
    palette: PALETTES[(k + 2) % PALETTES.length]!,
    startsAt: addDays(-30 - k * 3),
    endsAt: addDays(20 + k * 7),
    views,
    clicks: Math.round(views * (0.03 + ((k * 7) % 9) / 100)),
  };
  if (k === 2)
    return {
      ...base,
      startsAt: addDays(9),
      endsAt: addDays(40),
      views: 0,
      clicks: 0,
    };
  if (k === 5)
    return {
      ...base,
      startsAt: addDays(21),
      endsAt: null,
      views: 0,
      clicks: 0,
    };
  if (k === 7) return { ...base, startsAt: addDays(-80), endsAt: addDays(-6) };
  if (k === 9)
    return {
      ...base,
      status: "draft",
      startsAt: null,
      endsAt: null,
      views: 0,
      clicks: 0,
    };
  if (k === 4) return { ...base, endsAt: addDays(2) };
  return base;
});

const clock = persistentValue("content.clock", () => 0);
const stamp = () =>
  new Date(Date.parse(TODAY) + DAY + ++clock.value * 60_000).toISOString();

const store = persistentList<ContentBlock>("content", () =>
  [...seeds, ...generated].map((s, i) => ({
    ...s,
    imageUrl: "",
    status: s.status ?? "published",
    id: `cb-${i}`,
    updatedAt: new Date(Date.parse(TODAY) - (i + 3) * 3_600_000).toISOString(),
  })),
);
const seq = persistentValue("content.seq", () => store.length);

export const stateOf = (b: ContentBlock): BlockState => {
  if (b.status === "draft") return "draft";
  if (b.startsAt && b.startsAt > TODAY) return "scheduled";
  if (b.endsAt && b.endsAt < TODAY) return "expired";
  return "live";
};

const ctrOf = (b: ContentBlock) => (b.views ? (b.clicks / b.views) * 100 : 0);

const toRow = (b: ContentBlock): BlockRow => ({
  ...b,
  state: stateOf(b),
  ctr: Math.round(ctrOf(b) * 100) / 100,
  position: store.indexOf(b) + 1,
});

// --- Query ---

const pick = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;

const KIND_LIST: readonly BlockKind[] = [
  "hero",
  "promo",
  "category",
  "product",
  "brand",
  "marquee",
];

export const parseBlockQuery = (raw: Record<string, unknown>): BlockQuery => {
  const page = Number.parseInt(String(raw.page), 10);
  return {
    q: typeof raw.q === "string" ? raw.q.trim().slice(0, 80) : "",
    tab: pick<BlockTab>(raw.tab, ["all", ...KIND_LIST], "all"),
    state: pick<BlockStatusFilter>(
      raw.state,
      ["all", "live", "scheduled", "draft", "expired"],
      "all",
    ),
    page: Number.isFinite(page) ? Math.min(100_000, Math.max(1, page)) : 1,
    perPage: Number(pick(String(raw.perPage), ["8", "16", "32"] as const, "8")),
  };
};

const daysUntil = (iso: string) =>
  Math.round((Date.parse(iso) - Date.parse(TODAY)) / DAY);

export const queryBlocks = (query: BlockQuery): BlocksResponse => {
  const q = query.q.toLowerCase();
  const matches = (b: ContentBlock) =>
    (query.state === "all" || stateOf(b) === query.state) &&
    (!q ||
      b.title.toLowerCase().includes(q) ||
      b.link.toLowerCase().includes(q) ||
      b.subtitle.toLowerCase().includes(q));

  const searched = store.filter(matches);
  const counts = { all: searched.length } as BlocksResponse["counts"];
  for (const kind of KIND_LIST)
    counts[kind] = searched.filter((b) => b.kind === kind).length;

  const filtered =
    query.tab === "all"
      ? searched
      : searched.filter((b) => b.kind === query.tab);
  const pages = Math.max(1, Math.ceil(filtered.length / query.perPage));
  const page = Math.min(query.page, pages);
  const rows = filtered
    .slice((page - 1) * query.perPage, page * query.perPage)
    .map(toRow);

  // KPIs describe the whole book, not the current filter.
  const live = store.filter((b) => stateOf(b) === "live");
  const upcoming = store
    .filter((b) => stateOf(b) === "scheduled" && b.startsAt)
    .sort((a, b) => a.startsAt!.localeCompare(b.startsAt!));
  const views = live.reduce((n, b) => n + b.views, 0);
  const clicks = live.reduce((n, b) => n + b.clicks, 0);
  const ctr = views ? (clicks / views) * 100 : 0;
  const top = [...live].sort((a, b) => ctrOf(b) - ctrOf(a))[0];
  const expiringSoon = live.filter(
    (b) => b.endsAt && daysUntil(b.endsAt) <= 3,
  ).length;
  const incomplete = store.filter(
    (b) =>
      (stateOf(b) === "live" || stateOf(b) === "scheduled") &&
      !b.imageAlt.trim(),
  ).length;

  return {
    rows,
    total: filtered.length,
    page,
    perPage: query.perPage,
    counts,
    kpis: {
      live: live.length,
      slotCap: SLOT_CAP,
      scheduled: upcoming.length,
      nextTitle: upcoming[0]?.title ?? null,
      nextInDays: upcoming[0]?.startsAt
        ? daysUntil(upcoming[0].startsAt)
        : null,
      ctr: Math.round(ctr * 100) / 100,
      ctrDelta: Math.round((ctr - BASELINE_CTR) * 100) / 100,
      topTitle: top?.title ?? null,
      topCtr: top ? Math.round(ctrOf(top) * 100) / 100 : 0,
      attention: expiringSoon + incomplete,
      expiringSoon,
      incomplete,
    },
  };
};

// --- Validation ---

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const dateOrNull = (v: unknown) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v))
    ? v
    : null;

const validLink = (v: string) =>
  /^\/[^\s]*$/.test(v) || /^https:\/\/[^\s/]+\.[^\s]+$/.test(v);

// A picture is an https URL, a storefront path or a small uploaded image (a data URL).
const validImage = (v: string) =>
  !v ||
  /^https:\/\/[^\s]+$/.test(v) ||
  /^\/[^\s]+$/.test(v) ||
  (/^data:image\/(png|jpe?g|webp|avif|gif);base64,[A-Za-z0-9+/=]+$/.test(v) &&
    v.length <= 1_500_000);

export const validateBlock = (body: unknown): BlockInput | null => {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = str(b.title, 120);
  const link = str(b.link, 200);
  const imageUrl = typeof b.imageUrl === "string" ? b.imageUrl.trim() : "";
  const startsAt = dateOrNull(b.startsAt);
  const endsAt = dateOrNull(b.endsAt);
  if (title.length < 2 || !validLink(link) || !validImage(imageUrl))
    return null;
  if (startsAt && endsAt && endsAt < startsAt) return null;
  return {
    kind: pick<BlockKind>(b.kind, KIND_LIST, "hero"),
    title,
    subtitle: str(b.subtitle, 240),
    ctaLabel: str(b.ctaLabel, 30),
    link,
    imageUrl,
    imageAlt: str(b.imageAlt, 160),
    palette: pick<BlockPalette>(
      b.palette,
      ["ember", "ocean", "forest", "graphite", "violet", "sand"],
      "graphite",
    ),
    status: pick<BlockStatus>(b.status, ["published", "draft"], "draft"),
    startsAt,
    endsAt,
  };
};

// --- Writes ---

export const findBlock = (id: string) => store.find((b) => b.id === id);

/** New blocks go to the top of the list. */
export const createBlock = (input: BlockInput): BlockRow => {
  const block: ContentBlock = {
    ...input,
    id: `cb-${seq.value++}`,
    views: 0,
    clicks: 0,
    updatedAt: stamp(),
  };
  store.unshift(block);
  return toRow(block);
};

export const updateBlock = (id: string, input: BlockInput): BlockRow | null => {
  const block = findBlock(id);
  if (!block) return null;
  Object.assign(block, input, { updatedAt: stamp() });
  return toRow(block);
};

/** Publish or unpublish. Returns null when the block doesn't exist. */
export const setBlockStatus = (
  id: string,
  status: BlockStatus,
): BlockRow | null => {
  const block = findBlock(id);
  if (!block) return null;
  block.status = status;
  block.updatedAt = stamp();
  return toRow(block);
};

export const deleteBlock = (id: string): boolean => {
  const i = store.findIndex((b) => b.id === id);
  if (i < 0) return false;
  store.splice(i, 1);
  return true;
};

/** The given blocks swap into the positions they already occupy, in the new order. */
export const reorderBlocks = (ids: string[]): boolean => {
  const chosen = ids.map(findBlock);
  if (new Set(ids).size !== ids.length || chosen.some((b) => !b)) return false;
  // Work out every slot first: looking blocks up while writing would read a half-changed list.
  const slots = chosen.map((b) => store.indexOf(b!)).sort((a, b) => a - b);
  chosen.forEach((block, i) => {
    store[slots[i]!] = block!;
  });
  return true;
};