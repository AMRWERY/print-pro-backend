import { catalogProducts, categoryOptions } from "~/storefront/data/catalog";
import { defaultCompanionProducts, defaultRegistryItems } from "~/storefront/data/account";
import { featured } from "~/storefront/data/home";
import type {
  CatalogCategory,
  CatalogProduct,
  CopierAttrs,
  InkAttrs,
  PrinterAttrs,
} from "~/types/catalog";
import type { DetailedProduct, ProductDetail, SpecGroup } from "~/types/product";

// Items from the account area (saved items and suggested supplies), so they can be carted like any product.
const accountProducts: DetailedProduct[] = [
  ...defaultRegistryItems.map<DetailedProduct>((r) => ({
    id: r.id,
    sku: `PP-SAVED-${r.id}`,
    group: "printer",
    badge: { label: "Saved item", tone: "info", icon: "lucide:check" },
    brand: "PrintPro",
    name: r.name,
    blurb: r.specNotes,
    specs: ["Saved for later", "Tested before dispatch"],
    rating: 5,
    reviews: 1,
    price: r.price,
    lease: 0,
    icon: r.icon || "lucide:box",
    image: r.image,
  })),
  ...defaultCompanionProducts.map<DetailedProduct>((c) => ({
    id: c.id,
    sku: `PP-SUP-${c.id}`,
    group: "ink",
    badge: { label: c.badge, tone: "success", icon: "lucide:check" },
    brand: "PrintPro",
    name: c.name,
    blurb: c.description,
    specs: [c.tag, "Genuine"],
    rating: 5,
    reviews: 1,
    price: c.price,
    lease: 0,
    icon: c.icon || "lucide:box",
    image: c.image,
  })),
];

// The made-to-order print from the Print Lab; its price and options live on the cart line.
accountProducts.push({
  id: "custom-print",
  sku: "PP-PRINT-CUSTOM",
  group: "printer",
  badge: { label: "Made to order", tone: "info", icon: "lucide:printer" },
  brand: "PrintPro Print Lab",
  name: "Custom print job",
  blurb: "A print job configured in the Print Lab service.",
  specs: ["Your files", "Checked before printing"],
  rating: 5,
  reviews: 1,
  price: 0,
  lease: 0,
  icon: "lucide:printer",
  image: "/img/hero-img.png",
});

const base: DetailedProduct[] = [...catalogProducts, ...featured];

export const allProducts: DetailedProduct[] = [
  ...base,
  ...accountProducts.filter((a) => !base.some((b) => b.id === a.id)),
];

/** Product lookup across the catalogue, the home page and the account area. */
export const findProduct = (id: string): DetailedProduct | undefined =>
  allProducts.find((p) => p.id === id);

const categoryCrumb = (category: CatalogCategory) => {
  const to = {
    printers: "/products/printers",
    copiers: "/products/photocopiers",
    "inks-toner": "/products/inks-toner",
  }[category];
  return { label: categoryOptions.find((o) => o.key === category)!.label, to };
};

const yes = (v: boolean) => (v ? "Yes" : "No");
const list = (v: string[]) =>
  v.map((x) => x[0]!.toUpperCase() + x.slice(1)).join(", ");

/** Spec rows built from a product's attributes, so every product has category-specific specifications. */
const attrSpecGroups = (p: CatalogProduct): SpecGroup[] => {
  if (p.category === "printers") {
    const a = p.attrs as PrinterAttrs;
    return [
      {
        title: "Printing",
        rows: [
          { label: "Technology", value: list([a.technology.replace("-", " ")]) },
          { label: "Colour", value: a.colour === "colour" ? "Colour" : "Black & white" },
          { label: "Largest paper size", value: a.maxPaper },
          { label: "Automatic two-sided printing", value: yes(a.duplex) },
        ],
      },
      {
        title: "Connectivity",
        rows: [
          {
            label: "Interfaces",
            value: a.connectivity
              .map((c) => ({ wifi: "Wi-Fi", ethernet: "Ethernet", usb: "USB" })[c])
              .join(", "),
          },
        ],
      },
    ];
  }
  if (p.category === "copiers") {
    const a = p.attrs as CopierAttrs;
    return [
      {
        title: "Performance",
        rows: [
          { label: "Print and copy speed", value: `${a.ppm} pages per minute` },
          { label: "Paper size", value: a.paper },
          { label: "Colour", value: a.colour === "colour" ? "Colour" : "Black & white" },
          { label: "Automatic two-sided", value: yes(a.duplex) },
        ],
      },
      { title: "Functions", rows: [{ label: "Included", value: list(a.functions) }] },
    ];
  }
  const a = p.attrs as InkAttrs;
  return [
    {
      title: "Supply",
      rows: [
        { label: "Type", value: list([a.kind]) },
        { label: "Colour", value: a.colour === "multi" ? "Multi-colour set" : list([a.colour]) },
        { label: "Yield", value: a.yield },
      ],
    },
    { title: "Compatibility", rows: [{ label: "Fits", value: a.compatibleWith.join(", ") }] },
  ];
};

const perCategory = {
  printers: {
    packages: (price: number) => [
      { id: "std", label: "Printer only", note: "Printer, power cable, starter inks or toner and setup guide.", delta: 0 },
      { id: "care", label: "With setup and 2-year care plan", note: "We set it up on your network and cover repairs for two years.", delta: Math.round(price * 0.08) },
    ],
    assurance: ["Tested before dispatch", "Manufacturer warranty included", "Direct line to a technician"],
    qa: [
      { q: "Does it come with ink or toner?", a: "Yes. A starter set ships in the box. Full-size replacements are listed under Inks & Toner where we stock them. Ask us if you cannot find your model." },
      { q: "Can you set it up for us?", a: "Choose the setup option above and a technician installs and connects it to your network." },
    ],
  },
  copiers: {
    packages: (price: number) => [
      { id: "std", label: "Machine with delivery and installation", note: "Delivered, installed, connected to your network and tested.", delta: 0 },
      { id: "care", label: "With 3-year maintenance contract", note: "Scheduled servicing, parts and on-site repairs for three years.", delta: Math.round(price * 0.12) },
    ],
    assurance: ["Delivery and installation included", "Manufacturer warranty included", "Trade-in credit for your old machine"],
    qa: [
      { q: "Is installation included?", a: "Yes. A technician delivers, installs and tests the machine, and shows your team how to use it." },
      { q: "What supplies does it use?", a: "Compatible toner and drum units are listed under Inks & Toner where we stock them. Ask us for a supplies plan if you copy a lot." },
    ],
  },
  "inks-toner": {
    packages: () => [
      { id: "std", label: "Genuine, factory sealed", note: "Original supply in its sealed manufacturer packaging.", delta: 0 },
    ],
    assurance: ["Genuine and factory sealed", "Matched to the models listed", "Easy returns if the model does not fit"],
    qa: [
      { q: "How do I know this fits my machine?", a: "Check the Compatible with list on this page. If your model is not listed, contact us before ordering." },
      { q: "Is this a genuine supply?", a: "Yes. We sell original, factory-sealed supplies, never refilled or relabelled." },
    ],
  },
} as const;

const richDetails: Record<string, ProductDetail> = {
  "nordjet-lf-44": {
    subtitle: "44-inch wide-format printer for technical drawings and posters",
    crumbs: [
      { label: "Index", to: "/" },
      { label: "Printers", to: "/products/printers" },
      { label: "Large-format" },
      { label: "Nordjet Large-Format 44″" },
    ],
    compareAt: 89900,
    stockLabel: "Delivery & installation",
    leaseNote: "Lease from EGP 2,750 / mo",
    gallery: [
      { label: "Front", src: "/img/hero-img.png", alt: "Nordjet 44 inch large-format printer with a drawing in the output tray" },
      { label: "Printhead", icon: "lucide:printer" },
      { label: "Ink bay", icon: "lucide:droplets" },
      { label: "Roll feed", icon: "lucide:scroll-text" },
      { label: "Control panel", icon: "lucide:monitor" },
    ],
    packages: [
      { id: "std", label: "Printer with stand", note: "44″ printer, stand, starter inks and one roll holder.", delta: 0 },
      { id: "setup", label: "With installation and training", note: "A technician installs the printer, connects it to your network and trains your team.", delta: 3500 },
      { id: "care", label: "Installation + 3-year maintenance", note: "Installation, training and three years of servicing and parts.", delta: 9800 },
    ],
    assurance: [
      "Delivered on a pallet and installed on site",
      "Test prints checked before dispatch",
      "Roll of media and set of inks included",
    ],
    keyFacts: [
      { label: "Print width", value: "44″ (1118 mm)" },
      { label: "Resolution", value: "2400 × 1200 dpi" },
      { label: "Ink channels", value: "5" },
      { label: "Drawing speed", value: "A1 in 28 seconds" },
      { label: "Ink capacity", value: "300 ml cartridges" },
      { label: "Connectivity", value: "Ethernet · USB 3" },
    ],
    feature: {
      eyebrow: "Why choose this printer",
      title: "Built for drawings, posters and daily production",
      body: "A dependable wide-format printer for architecture, engineering and print shops that need sharp lines and consistent colour on every roll.",
      cards: [
        { eyebrow: "01 / Line quality", title: "Sharp technical drawings", body: "A dedicated black channel keeps thin lines and small text crisp, even at full speed.", metric: "Minimum line width: 0.02 mm" },
        { eyebrow: "02 / Productivity", title: "Fast, hands-off output", body: "Automatic roll switching and a built-in cutter let you queue jobs and walk away.", metric: "A1 print in 28 seconds" },
        { eyebrow: "03 / Running cost", title: "Large cartridges, low cost per print", body: "300 ml cartridges mean fewer changes and a lower cost for every square metre printed.", metric: "Cartridge capacity: 300 ml" },
      ],
    },
    benchmark: {
      title: "Print speed by mode",
      note: "Measured on A1 (594 × 841 mm) output with the supplied driver.",
      columns: ["Mode", "Media", "Resolution", "Time per A1", "Best for"],
      rows: [
        ["Draft", "Plain paper 80 gsm", "600 dpi", "28 s", "CAD checks"],
        ["Standard", "Coated paper 90 gsm", "1200 dpi", "52 s", "Drawings and plans"],
        ["High quality", "Coated paper 130 gsm", "2400 dpi", "1 min 40 s", "Presentations"],
        ["Poster", "Photo paper 190 gsm", "2400 dpi", "3 min 10 s", "Posters and signage"],
      ],
    },
    specGroups: [
      { title: "Print engine", rows: [
        { label: "Technology", value: "Inkjet, 5 ink channels" },
        { label: "Maximum resolution", value: "2400 × 1200 dpi" },
        { label: "Droplet size", value: "4 pl variable" },
        { label: "Cartridge capacity", value: "300 ml" },
      ] },
      { title: "Media handling", rows: [
        { label: "Maximum roll width", value: "44″ (1118 mm)" },
        { label: "Media thickness", value: "0.07 – 0.8 mm" },
        { label: "Cutter", value: "Automatic" },
        { label: "Sheet feed", value: "Manual, front" },
      ] },
      { title: "Connectivity", rows: [
        { label: "Interfaces", value: "Ethernet, USB 3.0" },
        { label: "Internal memory", value: "4 GB + 320 GB storage" },
        { label: "Drivers", value: "Windows, macOS" },
      ] },
      { title: "Size and power", rows: [
        { label: "Dimensions", value: "1900 × 920 × 1250 mm" },
        { label: "Weight", value: "58 kg with stand" },
        { label: "Power", value: "100–240 V, 50/60 Hz" },
      ] },
    ],
    documents: [
      { title: "Printer specification sheet", meta: "PDF · 1.8 MB", icon: "lucide:file-text" },
      { title: "Installation and site guide", meta: "PDF · 2.2 MB · 14 pages", icon: "lucide:ruler" },
      { title: "Drivers for Windows and macOS", meta: "ZIP · 86 MB", icon: "lucide:download" },
    ],
    reviews: {
      score: 4.8,
      count: 14,
      distribution: [11, 3, 0, 0, 0],
      items: [
        { author: "Delta Architects", location: "Cairo, EG", badge: "Verified purchase", title: "Plans come out sharp and fast", body: "We print A1 drawings all day. The lines stay crisp, the roll changes are quick and the installation team had us running the same afternoon.", date: "Mar 2026" },
        { author: "Nile Print House", location: "Giza, EG", badge: "Verified purchase", title: "Low running cost on posters", body: "The large cartridges mean we change ink far less often. Colour is consistent from one roll to the next.", date: "Jan 2026" },
      ],
    },
    qa: [
      { q: "Can it print on thick or coated paper?", a: "Yes. It handles media up to 0.8 mm thick. Choose the matching media setting in the driver for best results." },
      { q: "Is installation included?", a: "Choose an installation option above. A technician delivers, installs, connects and trains your team." },
    ],
    related: ["nordjet-lf-24", "nordjet-lf-ink-black", "nordjet-lf-ink-cyan", "nordjet-pro-a3"],
  },

  "kopira-pro-a3-30c": {
    subtitle: "A3 colour photocopier with touchscreen and scan-to-cloud",
    crumbs: [
      { label: "Index", to: "/" },
      { label: "Photocopiers", to: "/products/photocopiers" },
      { label: "A3 colour" },
      { label: "Kopira Pro A3 30 ppm Colour" },
    ],
    compareAt: 82900,
    stockLabel: "Delivery & installation",
    leaseNote: "Lease from EGP 2,547 / mo",
    gallery: [
      { label: "Front", icon: "lucide:copy" },
      { label: "Control panel", icon: "lucide:monitor" },
      { label: "Document feeder", icon: "lucide:layers" },
      { label: "Paper trays", icon: "lucide:archive" },
    ],
    packages: [
      { id: "std", label: "Machine with delivery and installation", note: "Copier, stand with two trays, starter toner, delivery and installation.", delta: 0 },
      { id: "finisher", label: "With booklet finisher", note: "Adds an offline stapler and booklet finisher for reports and handouts.", delta: 8900 },
      { id: "care", label: "Finisher + 3-year maintenance", note: "Finisher plus scheduled servicing, parts and on-site repairs for three years.", delta: 17900 },
    ],
    assurance: [
      "Delivered, installed and tested on site",
      "Staff training included",
      "Trade-in credit for your old machine",
    ],
    keyFacts: [
      { label: "Speed", value: "30 ppm colour and mono" },
      { label: "Paper size", value: "A3 / A4" },
      { label: "Paper capacity", value: "1,150 sheets" },
      { label: "Functions", value: "Copy · Print · Scan · Fax" },
      { label: "Scan speed", value: "80 ipm duplex" },
      { label: "Connectivity", value: "Ethernet · Wi-Fi · USB" },
    ],
    feature: {
      eyebrow: "Why choose this machine",
      title: "A colour workhorse for busy offices",
      body: "A reliable A3 colour photocopier that scans, prints and copies at a steady pace, with the controls your team already understands.",
      cards: [
        { eyebrow: "01 / Speed", title: "30 pages a minute in colour", body: "Colour and black-and-white run at the same speed, so there is no reason to switch for urgent jobs.", metric: "First copy in 7 seconds" },
        { eyebrow: "02 / Scanning", title: "Scan to email, folder or cloud", body: "A duplex document feeder scans both sides in one pass and sends files straight to where your team works.", metric: "80 images per minute" },
        { eyebrow: "03 / Security", title: "Secure print release", body: "Jobs wait at the machine until the owner enters a PIN or taps a card, so documents never sit in the tray.", metric: "PIN and card release" },
      ],
    },
    benchmark: {
      title: "Cost per page",
      note: "Based on the manufacturer's rated toner yield at 5% coverage.",
      columns: ["Output", "Toner", "Rated yield", "Cost per page", "Best for"],
      rows: [
        ["Black and white", "Black A3 series", "30,000 pages", "EGP 0.09", "Documents"],
        ["Colour (all toners)", "Black + C/M/Y set", "20,000 pages", "EGP 0.48", "Reports and proposals"],
        ["Drum unit", "A3 series drum", "100,000 pages", "EGP 0.06", "Included in every page"],
      ],
    },
    specGroups: [
      { title: "Performance", rows: [
        { label: "Print and copy speed", value: "30 ppm" },
        { label: "First copy", value: "7 seconds" },
        { label: "Resolution", value: "1200 × 1200 dpi" },
        { label: "Monthly duty cycle", value: "Up to 150,000 pages" },
      ] },
      { title: "Paper handling", rows: [
        { label: "Paper sizes", value: "A5 to A3, banner to 1200 mm" },
        { label: "Standard capacity", value: "1,150 sheets" },
        { label: "Maximum capacity", value: "3,300 sheets" },
        { label: "Automatic two-sided", value: "Yes" },
      ] },
      { title: "Scan and fax", rows: [
        { label: "Document feeder", value: "100-sheet duplex" },
        { label: "Scan destinations", value: "Email, folder, USB, cloud" },
        { label: "Fax", value: "Super G3, 33.6 kbps" },
      ] },
      { title: "Size and power", rows: [
        { label: "Dimensions", value: "587 × 685 × 790 mm" },
        { label: "Weight", value: "78 kg" },
        { label: "Power", value: "220–240 V, 50/60 Hz" },
      ] },
    ],
    documents: [
      { title: "Photocopier specification sheet", meta: "PDF · 2.1 MB", icon: "lucide:file-text" },
      { title: "Site preparation guide", meta: "PDF · 1.4 MB · 8 pages", icon: "lucide:ruler" },
      { title: "Print and scan drivers", meta: "ZIP · 120 MB", icon: "lucide:download" },
    ],
    reviews: {
      score: 4.7,
      count: 25,
      distribution: [18, 7, 0, 0, 0],
      items: [
        { author: "Al Noor School", location: "Alexandria, EG", badge: "Verified purchase", title: "Reliable all through exam season", body: "We copy thousands of pages a week. The machine has not jammed once, and the maintenance visits are quick.", date: "Feb 2026" },
        { author: "Horizon Accounting", location: "Cairo, EG", badge: "Verified purchase", title: "Scan to folder saved us hours", body: "Staff scan stacks of invoices straight into shared folders. Setup and training took one morning.", date: "Dec 2025" },
      ],
    },
    qa: [
      { q: "Does the price include toner?", a: "A starter toner set is included. Full-size replacements are under Inks & Toner and listed as compatible on this page." },
      { q: "Can we pay monthly?", a: "Yes. The lease price is shown beside the purchase price. See the Financing page for the terms." },
    ],
    compatibleWith: ["Kopira Toner Black A3 Series", "Kopira Toner Colour Set A3 Series"],
    related: ["kopira-pro-a3-45c", "kopira-pro-a3-35", "kopira-toner-a3-black", "kopira-toner-a3-colour"],
  },

  "corex-toner-210-hy": {
    subtitle: "High-yield black toner for the Corex Laser 210",
    crumbs: [
      { label: "Index", to: "/" },
      { label: "Inks & Toner", to: "/products/inks-toner" },
      { label: "Toner" },
      { label: "Corex Toner Black 210 High-Yield" },
    ],
    stockLabel: "In stock · ships today",
    gallery: [{ label: "Cartridge", icon: "lucide:droplets" }],
    packages: [
      { id: "std", label: "Genuine, factory sealed", note: "Original toner in its sealed manufacturer packaging.", delta: 0 },
    ],
    assurance: ["Genuine and factory sealed", "Matched to the Corex Laser 210", "Easy returns if the model does not fit"],
    keyFacts: [
      { label: "Type", value: "Toner" },
      { label: "Colour", value: "Black" },
      { label: "Yield", value: "About 6,000 pages" },
      { label: "Fits", value: "Corex Laser 210" },
    ],
    specGroups: [
      { title: "Supply", rows: [
        { label: "Type", value: "Toner cartridge" },
        { label: "Colour", value: "Black" },
        { label: "Rated yield", value: "About 6,000 pages at 5% coverage" },
        { label: "Cost per page", value: "About EGP 0.35" },
      ] },
    ],
    documents: [],
    qa: [
      { q: "How do I know this fits my machine?", a: "It fits the Corex Laser 210 only. Check the model name on the front of your printer." },
      { q: "What is the difference from the standard cartridge?", a: "The high-yield cartridge prints three times as many pages, which lowers the cost of every page." },
    ],
    compatibleWith: ["Corex Laser 210"],
    yieldNote: "Rated yield is measured at 5% page coverage. Heavier graphics use toner faster.",
    related: ["corex-toner-210", "corex-laser-210", "corex-toner-450-set", "corex-laser-450c"],
  },
};

/** Details for any product. Rich content where we have it, a category-based default otherwise. */
export const getProductDetail = (product: DetailedProduct): ProductDetail => {
  const rich = richDetails[product.id];
  if (rich) return rich;

  const cp = product as Partial<CatalogProduct>;
  const category: CatalogCategory = cp.category ?? "printers";
  const copy = perCategory[category];
  const specGroups: SpecGroup[] = cp.attrs
    ? attrSpecGroups(product as CatalogProduct)
    : [
        {
          title: "Key specifications",
          rows: product.specs.map((s, i) => ({ label: `Spec ${i + 1}`, value: s })),
        },
      ];

  return {
    subtitle: product.blurb,
    crumbs: [
      { label: "Index", to: "/" },
      categoryCrumb(category),
      { label: product.name },
    ],
    stockLabel: product.badge.label,
    leaseNote: product.lease
      ? `Lease from EGP ${product.lease.toLocaleString("en")} / mo`
      : undefined,
    gallery: [
      product.image
        ? { label: "Product", src: product.image, alt: product.imageAlt ?? product.name }
        : { label: "Product", icon: product.icon },
    ],
    packages: copy.packages(product.price),
    assurance: [...copy.assurance],
    keyFacts: specGroups.flatMap((g) => g.rows).slice(0, 4),
    specGroups,
    documents: [],
    qa: [...copy.qa],
    compatibleWith:
      category === "inks-toner" && cp.attrs
        ? (cp.attrs as InkAttrs).compatibleWith
        : undefined,
    yieldNote:
      category === "inks-toner" && cp.attrs
        ? `Rated yield: ${(cp.attrs as InkAttrs).yield}.`
        : undefined,
    related: catalogProducts
      .filter((p) => p.id !== product.id)
      .sort((a, b) => Number(b.category === category) - Number(a.category === category))
      .slice(0, 4)
      .map((p) => p.id),
  };
};
