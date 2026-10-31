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

// The content book: starts empty, filled from the admin Content screen.

/** The book has a fixed "today" so states and expiry are stable between reloads. */
const today = () => new Date().toISOString().slice(0, 10);
const DAY = 86_400_000;
const addDays = (days: number) =>
  new Date(Date.parse(today()) + days * DAY).toISOString().slice(0, 10);

export const SLOT_CAP = 24;

const clock = persistentValue("content.clock", () => 0);
const stamp = () =>
  new Date(Date.now() + ++clock.value).toISOString();

const store = persistentList<ContentBlock>("content", () => []);
const seq = persistentValue("content.seq", () => store.length);

export const stateOf = (b: ContentBlock): BlockState => {
  if (b.status === "draft") return "draft";
  if (b.startsAt && b.startsAt > today()) return "scheduled";
  if (b.endsAt && b.endsAt < today()) return "expired";
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
  Math.round((Date.parse(iso) - Date.parse(today())) / DAY);

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
      ctrDelta: 0,
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