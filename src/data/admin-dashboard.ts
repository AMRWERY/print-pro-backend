import type {
  DashboardSummary,
  RangeKey,
  RevenueSeries,
  RevenueUnit,
} from "~/types/admin/dashboard";

// Demo data for the executive bench. When the app has a backend this file goes away and
// server/api/admin/* proxies the real service.

export const dashboardSummary: DashboardSummary = {
  kpis: {
    revenue: {
      value: 482940,
      delta: 14.8,
      trend: [38, 41, 40, 46, 44, 52, 49, 58, 63, 61, 70, 78],
    },
    orders: { value: 1284, delta: 8.4 },
    customers: { value: 3420, delta: 142 },
    products: { value: 4812 },
    lowStock: { value: 7 },
    pendingOrders: { value: 42 },
  },
  lowStock: [
    {
      sku: "PP-TN-KAB-A3",
      name: "Kopira Toner Black A3 Series",
      spec: "Black toner · 30,000 pages",
      status: "critical",
      remaining: 2,
      threshold: 5,
      unit: "units",
      note: "lead",
      noteValue: "12d · Cairo",
      action: "restockToner",
    },
    {
      sku: "PP-TN-C21H",
      name: "Corex Toner Black 210 High-Yield",
      spec: "6,000 pages per cartridge",
      status: "depleting",
      remaining: 6,
      threshold: 15,
      unit: "cartridges",
      note: "run",
      noteValue: "Supplier batch",
      action: "restockToner",
    },
    {
      sku: "PP-IK-NP8",
      name: "Nordjet Pigment Ink 8-Colour Set",
      spec: "8 × 130 ml pigment set",
      status: "scheduled",
      remaining: 4,
      threshold: 12,
      unit: "packs",
      note: "edi",
      noteValue: "Scheduled",
      action: "confirmEdi",
    },
    {
      sku: "PP-KP-A335",
      name: "Kopira Pro A3 35 ppm Mono",
      spec: "A3 mono photocopier",
      status: "critical",
      remaining: 1,
      threshold: 3,
      unit: "units",
      note: "priority",
      noteValue: "Service desk",
      action: "emergencySpares",
    },
  ],
  topProducts: [
    {
      rank: 1,
      name: "Kopira Pro A3 35 ppm Mono",
      spec: "A3 mono · copy, print, scan, fax",
      division: "copiers",
      unitValue: 58900,
      volume: 6,
      volumeUnit: "units",
      revenue: 353400,
      qa: "100% TESTED",
      icon: "lucide:copy",
    },
    {
      rank: 2,
      name: 'Nordjet Large-Format 44" CAD & Poster',
      spec: "5 inks · stand included",
      division: "printers",
      unitValue: 82500,
      volume: 2,
      volumeUnit: "units",
      revenue: 165000,
      qa: "100% TESTED",
      icon: "lucide:printer",
    },
    {
      rank: 3,
      name: "Corex Toner Black 210 High-Yield",
      spec: "Black toner · 6,000 pages",
      division: "toner",
      unitValue: 2100,
      volume: 40,
      volumeUnit: "cartridges",
      revenue: 84000,
      qa: "GENUINE",
      icon: "lucide:droplets",
    },
    {
      rank: 4,
      name: "Kopira Toner Black A3 Series",
      spec: "Black toner · 30,000 pages",
      division: "toner",
      unitValue: 2800,
      volume: 19,
      volumeUnit: "cartridges",
      revenue: 53200,
      qa: "GENUINE",
      icon: "lucide:droplets",
    },
    {
      rank: 5,
      name: "Printa Tank Ink Colour Set (C/M/Y)",
      spec: "3 × 70 ml refill set",
      division: "ink",
      unitValue: 780,
      volume: 68,
      volumeUnit: "packs",
      revenue: 53040,
      qa: "GENUINE",
      icon: "lucide:droplets",
    },
  ],
  orders: {
    total: 42,
    slaPct: 100,
    rows: [
      {
        id: "#LP-948201",
        client: "Dr. Amal Fahmy",
        location: "Delta Architects · Cairo",
        allocation: "1× Kopira Pro A3 35 · 6× Toner Black",
        amount: 71690,
        status: "checking",
        action: "completeOrder",
      },
      {
        id: "#LP-948198",
        client: "Nile Print House",
        location: "Shubra · Cairo",
        allocation: "2× Corex Laser 450 · 12× Toner set",
        amount: 34720,
        status: "inTransit",
        action: "printDeliveryNote",
      },
      {
        id: "#LP-948195",
        client: "Cairo Language School",
        location: "Dokki · Giza",
        allocation: "1× Corex Laser 700 A3 Mono",
        amount: 27400,
        status: "completed",
        action: "viewOrder",
      },
      {
        id: "#LP-948190",
        client: "Sherif Accounting Group",
        location: "Smouha · Alexandria",
        allocation: "1× Printa Tank 500 · 4× Ink set",
        amount: 8520,
        status: "packing",
        action: "checkBatch",
      },
      {
        id: "#LP-948188",
        client: "Hassan Medical Clinics",
        location: "Maadi · Cairo",
        allocation: "4× Toner Black 210 · Kopira Drum Unit",
        amount: 14800,
        status: "completed",
        action: "viewOrder",
      },
    ],
  },
  customers: [
    { initials: "DA", name: "Delta Architects", location: "Dokki · Cairo", lifetimeValue: 142500, tier: "enterprise" },
    { initials: "NP", name: "Nile Print House", location: "Shubra · Cairo", lifetimeValue: 98400, tier: "printShop" },
    { initials: "SA", name: "Sherif Accounting Group", location: "Smouha · Alexandria", lifetimeValue: 76200, tier: "business" },
    { initials: "AU", name: "Alexandria University Press", location: "Shatby · Alexandria", lifetimeValue: 112800, tier: "enterprise" },
  ],
};

const RANGES: Record<
  RangeKey,
  { count: number; unit: RevenueUnit; scale: number }
> = {
  today: { count: 24, unit: "hour", scale: 0.04 },
  week: { count: 7, unit: "day", scale: 0.35 },
  month: { count: 30, unit: "day", scale: 1 },
  quarter: { count: 13, unit: "week", scale: 3.2 },
  year: { count: 12, unit: "month", scale: 12 },
};

export const isRangeKey = (value: unknown): value is RangeKey =>
  typeof value === "string" && Object.hasOwn(RANGES, value);

/** Deterministic wave so the charts are stable between reloads. */
export const revenueSeries = (range: RangeKey): RevenueSeries => {
  const { count, unit, scale } = RANGES[range];
  const points = Array.from({ length: count }, (_, i) => {
    const progress = count > 1 ? i / (count - 1) : 1;
    const wave = Math.sin(i * 1.3) * 0.08 + Math.sin(i * 0.5) * 0.05;
    const revenue = Math.round(scale * (20000 + progress * 16000) * (1 + wave));
    return { revenue, orders: Math.max(1, Math.round(revenue / 420)) };
  });
  const peakIndex = points.reduce(
    (best, p, i) => (p.revenue > points[best]!.revenue ? i : best),
    0,
  );
  return { range, unit, points, peakIndex };
};
