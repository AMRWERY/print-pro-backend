import type {
  AttrFilterDef,
  CatalogAttrs,
  CatalogCategory,
  CatalogProduct,
  CopierAttrs,
  DispatchKey,
  InkAttrs,
  PrinterAttrs,
  SortKey,
} from "~/types/catalog";

export const categoryOptions: { key: CatalogCategory; label: string }[] = [
  { key: "printers", label: "Printers" },
  { key: "copiers", label: "Photocopiers" },
  { key: "inks-toner", label: "Inks & Toner" },
];

export const dispatchOptions: { key: DispatchKey; label: string }[] = [
  { key: "in-stock", label: "In stock · ships today" },
  { key: "consignment", label: "Certified refurbished" },
  { key: "factory-order", label: "Special order" },
  { key: "freight", label: "Delivery & installation" },
];

export const sortOptions: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "rating", label: "Top rated" },
];

export const perPageOptions = [12, 24, 48] as const;

export const pricePresets = [
  { label: "Under EGP 1,000", min: null, max: 999 },
  { label: "EGP 1k – 10k", min: 1000, max: 10000 },
  { label: "EGP 10k – 50k", min: 10000, max: 50000 },
  { label: "EGP 50k+", min: 50000, max: null },
] as const;

export const ratingOptions = [4.5, 4] as const;

const inStock = {
  label: "In stock · ships today",
  tone: "success",
  icon: "lucide:circle-check",
} as const;

const freight = {
  label: "Delivery & installation",
  tone: "info",
  icon: "lucide:truck",
} as const;

const consignment = {
  label: "Certified refurbished",
  tone: "info",
  icon: "lucide:badge-check",
} as const;

const factory = {
  label: "Special order",
  tone: "warning",
  icon: "lucide:clock",
} as const;

export const badges = {
  "in-stock": inStock,
  freight,
  consignment,
  "factory-order": factory,
} as const;

const groups = {
  printers: "printer",
  copiers: "copier",
  "inks-toner": "ink",
} as const;

const icons = {
  printers: "lucide:printer",
  copiers: "lucide:copy",
  "inks-toner": "lucide:droplets",
} as const;

type Seed = {
  id: string;
  sku: string;
  category: CatalogCategory;
  dispatch: DispatchKey;
  brand: string;
  name: string;
  blurb: string;
  specs: [string, string, string];
  rating: number;
  reviews: number;
  price: number;
  /** Monthly lease in EGP. Omit when the product is not leased. */
  lease?: number;
  attrs: CatalogAttrs;
};

const make = (s: Seed): CatalogProduct => ({
  id: s.id,
  sku: s.sku,
  category: s.category,
  dispatch: s.dispatch,
  group: groups[s.category],
  badge: badges[s.dispatch],
  brand: s.brand,
  name: s.name,
  blurb: s.blurb,
  specs: s.specs,
  rating: s.rating,
  reviews: s.reviews,
  price: s.price,
  lease: s.lease ?? 0,
  icon: icons[s.category],
  attrs: s.attrs,
});

const printer = (
  s: Omit<Seed, "category" | "attrs">,
  attrs: PrinterAttrs,
) => make({ ...s, category: "printers", attrs });

const copier = (s: Omit<Seed, "category" | "attrs">, attrs: CopierAttrs) =>
  make({ ...s, category: "copiers", attrs });

const supply = (s: Omit<Seed, "category" | "attrs">, attrs: InkAttrs) =>
  make({ ...s, category: "inks-toner", attrs });

const baseProducts: CatalogProduct[] = [
  // Printers
  printer(
    { id: "printa-home-300", sku: "PP-PR-0300", dispatch: "in-stock", brand: "Printa", name: "Printa Home 300 Wireless Inkjet", blurb: "Compact colour inkjet for home and small-office printing, with phone and Wi-Fi printing.", specs: ["Colour inkjet", "A4", "Wi-Fi"], rating: 4.2, reviews: 64, price: 3200 },
    { technology: "inkjet", colour: "colour", maxPaper: "A4", connectivity: ["wifi", "usb"], duplex: false },
  ),
  printer(
    { id: "printa-mini", sku: "PP-PR-0120", dispatch: "in-stock", brand: "Printa", name: "Printa Mini Portable Inkjet", blurb: "Battery-powered portable printer for invoices and labels on the move.", specs: ["Portable", "A4", "Wi-Fi"], rating: 4.0, reviews: 22, price: 2400 },
    { technology: "inkjet", colour: "colour", maxPaper: "A4", connectivity: ["wifi", "usb"], duplex: false },
  ),
  printer(
    { id: "printa-tank-500", sku: "PP-PR-0500", dispatch: "in-stock", brand: "Printa", name: "Printa Tank 500 Ink-Tank All-Colour", blurb: "Refillable ink tanks for very low cost per page, with automatic two-sided printing.", specs: ["Ink tank", "A4 duplex", "Wi-Fi"], rating: 4.6, reviews: 131, price: 5400 },
    { technology: "inkjet", colour: "colour", maxPaper: "A4", connectivity: ["wifi", "ethernet", "usb"], duplex: true },
  ),
  printer(
    { id: "corex-laser-210", sku: "PP-CX-0210", dispatch: "in-stock", brand: "Corex", name: "Corex Laser 210 Mono", blurb: "Fast, reliable black-and-white laser printer for documents and invoices.", specs: ["Mono laser", "A4 duplex", "30 ppm"], rating: 4.5, reviews: 98, price: 6800 },
    { technology: "laser", colour: "mono", maxPaper: "A4", connectivity: ["ethernet", "usb"], duplex: true },
  ),
  printer(
    { id: "corex-laser-450c", sku: "PP-CX-0450", dispatch: "in-stock", brand: "Corex", name: "Corex Laser 450 Colour", blurb: "Colour laser printer with sharp text and graphics for busy offices.", specs: ["Colour laser", "A4 duplex", "28 ppm"], rating: 4.4, reviews: 57, price: 14900, lease: 497 },
    { technology: "laser", colour: "colour", maxPaper: "A4", connectivity: ["wifi", "ethernet", "usb"], duplex: true },
  ),
  printer(
    { id: "corex-laser-700-a3", sku: "PP-CX-0700", dispatch: "freight", brand: "Corex", name: "Corex Laser 700 A3 Mono", blurb: "A3 black-and-white laser workhorse for drawings, spreadsheets and posters.", specs: ["Mono laser", "A3 duplex", "40 ppm"], rating: 4.6, reviews: 33, price: 27400, lease: 913 },
    { technology: "laser", colour: "mono", maxPaper: "A3", connectivity: ["ethernet", "usb"], duplex: true },
  ),
  printer(
    { id: "nordjet-pro-a3", sku: "PP-NJ-0A3", dispatch: "in-stock", brand: "Nordjet", name: "Nordjet Pro A3 Colour Inkjet", blurb: "Pigment inkjet that prints A3 colour for proofs, marketing and presentations.", specs: ["Colour inkjet", "A3", "Ethernet"], rating: 4.7, reviews: 41, price: 18500, lease: 617 },
    { technology: "inkjet", colour: "colour", maxPaper: "A3", connectivity: ["wifi", "ethernet", "usb"], duplex: true },
  ),
  printer(
    { id: "vantix-colour-a3", sku: "PP-VX-0A3", dispatch: "freight", brand: "Vantix", name: "Vantix Colour Laser A3 Workgroup", blurb: "High-volume A3 colour laser for workgroups, with finishing options.", specs: ["Colour laser", "A3 duplex", "35 ppm"], rating: 4.5, reviews: 19, price: 39900, lease: 1330 },
    { technology: "laser", colour: "colour", maxPaper: "A3", connectivity: ["wifi", "ethernet", "usb"], duplex: true },
  ),
  printer(
    { id: "nordjet-lf-24", sku: "PP-NJ-LF24", dispatch: "freight", brand: "Nordjet", name: 'Nordjet Large-Format 24" Plotter', blurb: "Roll-fed plotter for CAD drawings, posters and signage up to 24 inches wide.", specs: ['24" roll', "4 inks", "Ethernet"], rating: 4.6, reviews: 27, price: 38900, lease: 1297 },
    { technology: "large-format", colour: "colour", maxPaper: "A1", connectivity: ["wifi", "ethernet", "usb"], duplex: false },
  ),
  printer(
    { id: "nordjet-lf-44", sku: "PP-NJ-LF44", dispatch: "freight", brand: "Nordjet", name: 'Nordjet Large-Format 44" CAD & Poster', blurb: "Wide-format printer for technical drawings and large posters up to 44 inches.", specs: ['44" roll', "5 inks", "Stand incl."], rating: 4.8, reviews: 14, price: 82500, lease: 2750 },
    { technology: "large-format", colour: "colour", maxPaper: "A0", connectivity: ["ethernet", "usb"], duplex: false },
  ),

  // Photocopiers
  copier(
    { id: "kopira-office-20", sku: "PP-KP-0020", dispatch: "in-stock", brand: "Kopira", name: "Kopira Office 20 A4 Mono MFP", blurb: "Compact black-and-white multifunction for small offices: copy, print and scan.", specs: ["20 ppm", "A4", "Copy · Print · Scan"], rating: 4.3, reviews: 46, price: 12500, lease: 417 },
    { ppm: 20, paper: "A4", colour: "mono", functions: ["copy", "print", "scan"], duplex: true },
  ),
  copier(
    { id: "kopira-office-35", sku: "PP-KP-0035", dispatch: "in-stock", brand: "Kopira", name: "Kopira Office 35 A4 Mono MFP", blurb: "Faster A4 multifunction with a 50-sheet automatic document feeder.", specs: ["35 ppm", "A4", "Copy · Print · Scan"], rating: 4.5, reviews: 38, price: 18900, lease: 630 },
    { ppm: 35, paper: "A4", colour: "mono", functions: ["copy", "print", "scan", "fax"], duplex: true },
  ),
  copier(
    { id: "kopira-office-28c", sku: "PP-KP-028C", dispatch: "in-stock", brand: "Kopira", name: "Kopira Office 28 A4 Colour MFP", blurb: "Colour multifunction for offices that copy, scan to email and fax every day.", specs: ["28 ppm", "A4 colour", "Fax"], rating: 4.4, reviews: 52, price: 24900, lease: 830 },
    { ppm: 28, paper: "A4", colour: "colour", functions: ["copy", "print", "scan", "fax"], duplex: true },
  ),
  copier(
    { id: "kopira-pro-a3-25", sku: "PP-KP-A325", dispatch: "freight", brand: "Kopira", name: "Kopira Pro A3 25 ppm Mono", blurb: "Entry A3 photocopier with a sturdy paper cabinet and secure print release.", specs: ["25 ppm", "A3", "Cabinet incl."], rating: 4.4, reviews: 29, price: 41500, lease: 1383 },
    { ppm: 25, paper: "A3", colour: "mono", functions: ["copy", "print", "scan"], duplex: true },
  ),
  copier(
    { id: "kopira-pro-a3-35", sku: "PP-KP-A335", dispatch: "freight", brand: "Kopira", name: "Kopira Pro A3 35 ppm Mono", blurb: "Mid-range A3 photocopier for busy departments, with optional finisher.", specs: ["35 ppm", "A3", "Finisher ready"], rating: 4.6, reviews: 34, price: 58900, lease: 1963 },
    { ppm: 35, paper: "A3", colour: "mono", functions: ["copy", "print", "scan", "fax"], duplex: true },
  ),
  copier(
    { id: "kopira-pro-a3-30c", sku: "PP-KP-A33C", dispatch: "freight", brand: "Kopira", name: "Kopira Pro A3 30 ppm Colour", blurb: "A3 colour photocopier with a touchscreen and scan-to-cloud.", specs: ["30 ppm", "A3 colour", "Touchscreen"], rating: 4.7, reviews: 25, price: 76400, lease: 2547 },
    { ppm: 30, paper: "A3", colour: "colour", functions: ["copy", "print", "scan", "fax"], duplex: true },
  ),
  copier(
    { id: "kopira-pro-a3-45c", sku: "PP-KP-A34C", dispatch: "freight", brand: "Kopira", name: "Kopira Pro A3 45 ppm Colour", blurb: "Fast A3 colour photocopier for print rooms and large offices.", specs: ["45 ppm", "A3 colour", "Booklet finisher"], rating: 4.7, reviews: 18, price: 118000, lease: 3933 },
    { ppm: 45, paper: "A3", colour: "colour", functions: ["copy", "print", "scan", "fax"], duplex: true },
  ),
  copier(
    { id: "vantix-production-60", sku: "PP-VX-P060", dispatch: "factory-order", brand: "Vantix", name: "Vantix Production 60 ppm Mono", blurb: "High-volume black-and-white production copier for print shops.", specs: ["60 ppm", "A3", "High volume"], rating: 4.8, reviews: 11, price: 195000, lease: 6500 },
    { ppm: 60, paper: "A3", colour: "mono", functions: ["copy", "print", "scan"], duplex: true },
  ),
  copier(
    { id: "vantix-production-75c", sku: "PP-VX-P75C", dispatch: "factory-order", brand: "Vantix", name: "Vantix Production 75 ppm Colour", blurb: "Colour production system for commercial print rooms, with inline finishing.", specs: ["75 ppm", "A3 colour", "Inline finishing"], rating: 4.9, reviews: 7, price: 289000, lease: 9633 },
    { ppm: 75, paper: "A3", colour: "colour", functions: ["copy", "print", "scan"], duplex: true },
  ),

  // Inks & Toner
  supply(
    { id: "printa-ink-black", sku: "PP-IK-PB70", dispatch: "in-stock", brand: "Printa", name: "Printa Tank Ink Black 70 ml", blurb: "Genuine black refill bottle for Printa ink-tank printers.", specs: ["70 ml", "Black", "4,500 pages"], rating: 4.7, reviews: 210, price: 320 },
    { kind: "ink", colour: "black", compatibleWith: ["Printa Tank 500"], compatibleBrands: ["Printa"], yield: "About 4,500 pages" },
  ),
  supply(
    { id: "printa-ink-colour-set", sku: "PP-IK-PC3", dispatch: "in-stock", brand: "Printa", name: "Printa Tank Ink Colour Set (C/M/Y)", blurb: "Cyan, magenta and yellow refill bottles in one set.", specs: ["3 × 70 ml", "Colour", "7,000 pages"], rating: 4.6, reviews: 158, price: 780 },
    { kind: "ink", colour: "multi", compatibleWith: ["Printa Tank 500"], compatibleBrands: ["Printa"], yield: "About 7,000 pages" },
  ),
  supply(
    { id: "nordjet-pigment-set", sku: "PP-IK-NP8", dispatch: "in-stock", brand: "Nordjet", name: "Nordjet Pigment Ink 8-Colour Set 130 ml", blurb: "Full pigment ink set for fade-resistant A3 prints.", specs: ["8 × 130 ml", "Pigment", "Full set"], rating: 4.8, reviews: 36, price: 4900 },
    { kind: "ink", colour: "multi", compatibleWith: ["Nordjet Pro A3"], compatibleBrands: ["Nordjet"], yield: "8 × 130 ml" },
  ),
  supply(
    { id: "nordjet-lf-ink-cyan", sku: "PP-IK-NLC", dispatch: "in-stock", brand: "Nordjet", name: "Nordjet LF Ink Cartridge Cyan 300 ml", blurb: "Large-format cyan cartridge for Nordjet 24 and 44 inch plotters.", specs: ["300 ml", "Cyan", "Large-format"], rating: 4.6, reviews: 21, price: 1450 },
    { kind: "ink", colour: "cyan", compatibleWith: ['Nordjet Large-Format 24"', 'Nordjet Large-Format 44"'], compatibleBrands: ["Nordjet"], yield: "300 ml" },
  ),
  supply(
    { id: "nordjet-lf-ink-black", sku: "PP-IK-NLK", dispatch: "in-stock", brand: "Nordjet", name: "Nordjet LF Ink Cartridge Black 300 ml", blurb: "Large-format black cartridge for sharp line drawings and text.", specs: ["300 ml", "Black", "Large-format"], rating: 4.7, reviews: 25, price: 1450 },
    { kind: "ink", colour: "black", compatibleWith: ['Nordjet Large-Format 24"', 'Nordjet Large-Format 44"'], compatibleBrands: ["Nordjet"], yield: "300 ml" },
  ),
  supply(
    { id: "corex-toner-210", sku: "PP-TN-C210", dispatch: "in-stock", brand: "Corex", name: "Corex Toner Black 210 (2,000 pages)", blurb: "Standard-yield black toner for Corex Laser 210.", specs: ["Black", "2,000 pages", "Standard"], rating: 4.5, reviews: 88, price: 950 },
    { kind: "toner", colour: "black", compatibleWith: ["Corex Laser 210"], compatibleBrands: ["Corex"], yield: "About 2,000 pages" },
  ),
  supply(
    { id: "corex-toner-210-hy", sku: "PP-TN-C21H", dispatch: "in-stock", brand: "Corex", name: "Corex Toner Black 210 High-Yield (6,000 pages)", blurb: "High-yield black toner that lowers the cost per page.", specs: ["Black", "6,000 pages", "High-yield"], rating: 4.7, reviews: 73, price: 2100 },
    { kind: "toner", colour: "black", compatibleWith: ["Corex Laser 210"], compatibleBrands: ["Corex"], yield: "About 6,000 pages" },
  ),
  supply(
    { id: "corex-toner-450-set", sku: "PP-TN-C45S", dispatch: "in-stock", brand: "Corex", name: "Corex Toner Colour Set 450 (C/M/Y/K)", blurb: "Four-colour toner set for Corex Laser 450.", specs: ["4 colours", "3,000 pages", "Full set"], rating: 4.5, reviews: 41, price: 5200 },
    { kind: "toner", colour: "multi", compatibleWith: ["Corex Laser 450 Colour"], compatibleBrands: ["Corex"], yield: "About 3,000 pages per colour" },
  ),
  supply(
    { id: "kopira-toner-a3-black", sku: "PP-TN-KAB", dispatch: "in-stock", brand: "Kopira", name: "Kopira Toner Black A3 Series", blurb: "High-capacity black toner for Kopira Pro A3 photocopiers.", specs: ["Black", "30,000 pages", "A3 series"], rating: 4.7, reviews: 64, price: 2800 },
    { kind: "toner", colour: "black", compatibleWith: ["Kopira Pro A3 25 ppm", "Kopira Pro A3 35 ppm", "Kopira Pro A3 30 ppm Colour", "Kopira Pro A3 45 ppm Colour"], compatibleBrands: ["Kopira"], yield: "About 30,000 pages" },
  ),
  supply(
    { id: "kopira-toner-a3-colour", sku: "PP-TN-KAC", dispatch: "in-stock", brand: "Kopira", name: "Kopira Toner Colour Set A3 Series", blurb: "Cyan, magenta and yellow toner for Kopira Pro A3 colour models.", specs: ["C/M/Y", "20,000 pages", "A3 series"], rating: 4.6, reviews: 39, price: 7900 },
    { kind: "toner", colour: "multi", compatibleWith: ["Kopira Pro A3 30 ppm Colour", "Kopira Pro A3 45 ppm Colour"], compatibleBrands: ["Kopira"], yield: "About 20,000 pages per colour" },
  ),
  supply(
    { id: "kopira-drum-a3", sku: "PP-DR-KA3", dispatch: "in-stock", brand: "Kopira", name: "Kopira Drum Unit A3 Series", blurb: "Replacement imaging drum that keeps copies free of streaks and marks.", specs: ["Drum unit", "100,000 pages", "A3 series"], rating: 4.6, reviews: 27, price: 6400 },
    { kind: "drum", colour: "black", compatibleWith: ["Kopira Pro A3 25 ppm", "Kopira Pro A3 35 ppm"], compatibleBrands: ["Kopira"], yield: "About 100,000 pages" },
  ),
  supply(
    { id: "vantix-production-toner", sku: "PP-TN-VPB", dispatch: "factory-order", brand: "Vantix", name: "Vantix Production Toner Black", blurb: "High-volume black toner cartridge for Vantix production systems.", specs: ["Black", "80,000 pages", "Production"], rating: 4.8, reviews: 9, price: 5600 },
    { kind: "toner", colour: "black", compatibleWith: ["Vantix Production 60 ppm Mono"], compatibleBrands: ["Vantix"], yield: "About 80,000 pages" },
  ),
];

// Every card gets a picture. Products without their own borrow one from
// public/img until real product images are added; set `image` on the product to override.
const stockImages = [
  "/img/prod-01.png",
  "/img/prod-02.png",
  "/img/prod-03.png",
  "/img/prod-04.png",
];

let borrowed = 0;
export const catalogProducts: CatalogProduct[] = baseProducts.map((p) =>
  p.image
    ? p
    : {
        ...p,
        image: stockImages[borrowed++ % stockImages.length],
        imageAlt: `${p.brand} ${p.name}`,
      },
);

/** Generic category pages: /products/<slug>. "scope" limits which products are listed. */
export const categoryPages: Record<
  string,
  { label: string; description: string; scope: CatalogCategory[] }
> = {
  printers: {
    label: "Printers",
    description: "Inkjet, laser and large-format printers for the home, the office and the print room.",
    scope: ["printers"],
  },
  photocopiers: {
    label: "Photocopiers",
    description: "A4 and A3 multifunction photocopiers, from small-office machines to production systems.",
    scope: ["copiers"],
  },
  "inks-toner": {
    label: "Inks & Toner",
    description: "Genuine ink, toner and drum units, matched to your printer or photocopier model.",
    scope: ["inks-toner"],
  },
};

/** Extra words people search for that don't appear in product text. */
export const categoryKeywords: Record<CatalogCategory, string> = {
  printers: "printer printers print printing inkjet laser plotter wide format",
  copiers: "copier copiers photocopier photocopiers copy copying mfp multifunction scanner scan fax",
  "inks-toner": "ink inks toner toners cartridge cartridges drum refill supplies consumables",
};

// Category-specific filters. They only show when exactly one category is selected.
const yesNo = (v: boolean) => (v ? "yes" : "no");

export const attrFilterDefs: Record<CatalogCategory, AttrFilterDef[]> = {
  printers: [
    { key: "technology", label: "Technology", options: [{ value: "inkjet", label: "Inkjet" }, { value: "laser", label: "Laser" }, { value: "large-format", label: "Large-format" }] },
    { key: "colour", label: "Colour", options: [{ value: "colour", label: "Colour" }, { value: "mono", label: "Black & white" }] },
    { key: "maxPaper", label: "Largest paper size", options: [{ value: "A4", label: "A4" }, { value: "A3", label: "A3" }, { value: "A2", label: "A2" }, { value: "A1", label: "A1" }, { value: "A0", label: "A0" }] },
    { key: "connectivity", label: "Connectivity", options: [{ value: "wifi", label: "Wi-Fi" }, { value: "ethernet", label: "Ethernet" }, { value: "usb", label: "USB" }] },
    { key: "duplex", label: "Two-sided printing", options: [{ value: "yes", label: "Automatic duplex" }] },
  ],
  copiers: [
    { key: "speed", label: "Speed", options: [{ value: "up-to-25", label: "Up to 25 ppm" }, { value: "26-45", label: "26 – 45 ppm" }, { value: "46-plus", label: "46 ppm and above" }] },
    { key: "paper", label: "Paper size", options: [{ value: "A4", label: "A4" }, { value: "A3", label: "A3" }] },
    { key: "colour", label: "Colour", options: [{ value: "colour", label: "Colour" }, { value: "mono", label: "Black & white" }] },
    { key: "functions", label: "Functions", options: [{ value: "copy", label: "Copy" }, { value: "print", label: "Print" }, { value: "scan", label: "Scan" }, { value: "fax", label: "Fax" }] },
  ],
  "inks-toner": [
    { key: "kind", label: "Type", options: [{ value: "ink", label: "Ink" }, { value: "toner", label: "Toner" }, { value: "drum", label: "Drum unit" }] },
    { key: "colour", label: "Colour", options: [{ value: "black", label: "Black" }, { value: "cyan", label: "Cyan" }, { value: "magenta", label: "Magenta" }, { value: "yellow", label: "Yellow" }, { value: "multi", label: "Multi-colour set" }] },
    { key: "compatibleBrand", label: "Fits brand", options: [{ value: "Printa", label: "Printa" }, { value: "Corex", label: "Corex" }, { value: "Nordjet", label: "Nordjet" }, { value: "Kopira", label: "Kopira" }, { value: "Vantix", label: "Vantix" }] },
  ],
};

/** The values a product has for one filter attribute (empty when it does not have that attribute). */
export const attrValues = (p: CatalogProduct, key: string): string[] => {
  if (p.category === "printers") {
    const a = p.attrs as PrinterAttrs;
    if (key === "technology") return [a.technology];
    if (key === "colour") return [a.colour];
    if (key === "maxPaper") return [a.maxPaper];
    if (key === "connectivity") return a.connectivity;
    if (key === "duplex") return a.duplex ? [yesNo(true)] : [];
  }
  if (p.category === "copiers") {
    const a = p.attrs as CopierAttrs;
    if (key === "speed")
      return [a.ppm <= 25 ? "up-to-25" : a.ppm <= 45 ? "26-45" : "46-plus"];
    if (key === "paper") return [a.paper];
    if (key === "colour") return [a.colour];
    if (key === "functions") return a.functions;
  }
  if (p.category === "inks-toner") {
    const a = p.attrs as InkAttrs;
    if (key === "kind") return [a.kind];
    if (key === "colour") return [a.colour];
    if (key === "compatibleBrand") return a.compatibleBrands;
  }
  return [];
};
