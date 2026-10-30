import type { Tone } from "~/types/shared/VStatusBadge";
import type {
  BlockKind,
  BlockPalette,
  BlockState,
  BlockStatusFilter,
  BlockTab,
  PreviewDevice,
} from "~/types/admin/content";

// Labels, tones and artwork for the content screen (no Tailwind classes, see order-meta.ts).

export const kindMeta: Record<
  BlockKind,
  {
    label: string;
    short: string;
    slot: string;
    icon: string;
    ratio: string;
    hint: string;
  }
> = {
  hero: {
    label: "Homepage hero banner",
    short: "Hero banners",
    slot: "Homepage hero",
    icon: "lucide:panels-top-left",
    ratio: "16 / 7",
    hint: "Full-width banner at the top of the homepage.",
  },
  promo: {
    label: "Promotional banner",
    short: "Promo banners",
    slot: "Promo strip",
    icon: "lucide:megaphone",
    ratio: "21 / 6",
    hint: "Wide strip between homepage sections.",
  },
  category: {
    label: "Featured category",
    short: "Featured categories",
    slot: "Category tile",
    icon: "lucide:folder-heart",
    ratio: "1 / 1",
    hint: "Square tile in the featured categories grid.",
  },
  product: {
    label: "Featured product",
    short: "Featured products",
    slot: "Product spotlight",
    icon: "lucide:star",
    ratio: "4 / 3",
    hint: "Spotlight card for a single product.",
  },
  brand: {
    label: "Brand section",
    short: "Brand sections",
    slot: "Brand spotlight",
    icon: "lucide:badge-check",
    ratio: "3 / 2",
    hint: "Story block for a brand or manufacturer.",
  },
  marquee: {
    label: "Homepage promotional content",
    short: "Promotional content",
    slot: "Marquee",
    icon: "lucide:text-select",
    ratio: "32 / 9",
    hint: "Short announcement or offer on the homepage.",
  },
};

export const kindOptions = (Object.keys(kindMeta) as BlockKind[]).map(
  (value) => ({
    value,
    label: kindMeta[value].label,
  }),
);

export const tabs: { value: BlockTab; label: string }[] = [
  { value: "all", label: "All modules" },
  ...(Object.keys(kindMeta) as BlockKind[]).map((value) => ({
    value,
    label: kindMeta[value].short,
  })),
];

export const stateMeta: Record<
  BlockState,
  { label: string; tone: Tone; icon: string }
> = {
  live: { label: "Published", tone: "success", icon: "lucide:circle-check" },
  scheduled: {
    label: "Scheduled",
    tone: "warning",
    icon: "lucide:calendar-clock",
  },
  expired: { label: "Expired", tone: "neutral", icon: "lucide:clock" },
  draft: { label: "Draft", tone: "neutral", icon: "lucide:file-text" },
};

export const stateOptions: { value: BlockStatusFilter; label: string }[] = [
  { value: "all", label: "Status: all" },
  { value: "live", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Draft" },
  { value: "expired", label: "Expired" },
];

export const statusChoices = [
  { value: "published", label: "Published (follows the schedule)" },
  { value: "draft", label: "Draft (hidden from the storefront)" },
];

/** Artwork shown when a block has no picture. White text stays readable on all of them. */
export const paletteMeta: Record<
  BlockPalette,
  { label: string; from: string; to: string; swatch: string }
> = {
  ember: { label: "Ember", from: "#7f1d1d", to: "#ea580c", swatch: "#dc2626" },
  ocean: { label: "Ocean", from: "#0c4a6e", to: "#0e7490", swatch: "#0284c7" },
  forest: {
    label: "Forest",
    from: "#14532d",
    to: "#4d7c0f",
    swatch: "#16a34a",
  },
  graphite: {
    label: "Graphite",
    from: "#18181b",
    to: "#52525b",
    swatch: "#3f3f46",
  },
  violet: {
    label: "Violet",
    from: "#4c1d95",
    to: "#a21caf",
    swatch: "#7c3aed",
  },
  sand: { label: "Sand", from: "#78350f", to: "#b45309", swatch: "#d97706" },
};

export const paletteOptions = (Object.keys(paletteMeta) as BlockPalette[]).map(
  (value) => ({
    value,
    label: paletteMeta[value].label,
  }),
);

export const deviceMeta: Record<
  PreviewDevice,
  { label: string; icon: string; width: string; px: number }
> = {
  desktop: {
    label: "Desktop",
    icon: "lucide:monitor",
    width: "100%",
    px: 1280,
  },
  tablet: { label: "Tablet", icon: "lucide:tablet", width: "70%", px: 768 },
  mobile: { label: "Mobile", icon: "lucide:smartphone", width: "38%", px: 390 },
};

export const deviceOptions = (Object.keys(deviceMeta) as PreviewDevice[]).map(
  (value) => ({
    value,
    label: deviceMeta[value].label,
  }),
);

export const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });

/** "Oct 15 – Nov 30", "From Nov 15", "Until Dec 01" or "No end date". */
export const windowLabel = (startsAt: string | null, endsAt: string | null) => {
  if (startsAt && endsAt) return `${dayLabel(startsAt)} – ${dayLabel(endsAt)}`;
  if (startsAt) return `From ${dayLabel(startsAt)}`;
  if (endsAt) return `Until ${dayLabel(endsAt)}`;
  return "Always on";
};