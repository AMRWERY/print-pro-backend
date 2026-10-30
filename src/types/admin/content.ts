export type BlockKind =
  | "hero"
  | "promo"
  | "category"
  | "product"
  | "brand"
  | "marquee";

/** What an admin sets. The visible state is worked out from this and the schedule. */
export type BlockStatus = "published" | "draft";

export type BlockState = "live" | "scheduled" | "expired" | "draft";

export type BlockPalette =
  | "ember"
  | "ocean"
  | "forest"
  | "graphite"
  | "violet"
  | "sand";

export type BlockTab = "all" | BlockKind;

export type BlockStatusFilter = "all" | BlockState;

export type PreviewDevice = "desktop" | "tablet" | "mobile";

export interface ContentBlock {
  id: string;
  kind: BlockKind;
  title: string;
  subtitle: string;
  ctaLabel: string;
  /** Where the block links to: a storefront path or an https URL. */
  link: string;
  /** A picture URL or an uploaded data URL. Empty means the palette artwork is used. */
  imageUrl: string;
  imageAlt: string;
  palette: BlockPalette;
  status: BlockStatus;
  startsAt: string | null;
  endsAt: string | null;
  views: number;
  clicks: number;
  updatedAt: string;
}

/** Everything an admin edits in the form. */
export type BlockInput = Omit<
  ContentBlock,
  "id" | "views" | "clicks" | "updatedAt"
>;

export interface BlockRow extends ContentBlock {
  state: BlockState;
  /** Click-through rate in percent. */
  ctr: number;
  /** Position in the whole list, starting at 1. */
  position: number;
}

export interface BlockQuery {
  q: string;
  tab: BlockTab;
  state: BlockStatusFilter;
  page: number;
  perPage: number;
}

export interface BlocksResponse {
  rows: BlockRow[];
  total: number;
  page: number;
  perPage: number;
  /** Rows per tab for the current search and state filter. */
  counts: Record<BlockTab, number>;
  kpis: {
    live: number;
    slotCap: number;
    scheduled: number;
    nextTitle: string | null;
    nextInDays: number | null;
    ctr: number;
    ctrDelta: number;
    topTitle: string | null;
    topCtr: number;
    attention: number;
    expiringSoon: number;
    incomplete: number;
  };
}