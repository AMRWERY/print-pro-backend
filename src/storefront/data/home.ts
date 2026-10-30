import { catalogProducts } from "~/storefront/data/catalog";
import type { CatalogCategory } from "~/types/catalog";
import type { Product } from "~/types/home";

export const promoItems = [
  "Free delivery on orders over EGP 2,500",
  "Installation and setup included with every photocopier",
  "Genuine ink and toner, matched to your model",
];

const countIn = (category: CatalogCategory) =>
  catalogProducts.filter((p) => p.category === category).length;

export const categories = [
  {
    label: "Printers",
    to: "/products/printers",
    terms: ["printer", "printers"],
    icon: "lucide:printer",
    blurb: "Inkjet, laser and large-format printers for home, office and print room.",
    meta: `${countIn("printers")} models`,
  },
  {
    label: "Photocopiers",
    to: "/products/photocopiers",
    terms: ["copier", "copiers", "photocopier", "photocopiers"],
    icon: "lucide:copy",
    blurb: "A4 and A3 multifunction machines, from small office to production.",
    meta: `${countIn("copiers")} models`,
  },
  {
    label: "Inks & Toner",
    to: "/products/inks-toner",
    terms: ["ink", "inks", "toner", "toners"],
    icon: "lucide:droplets",
    blurb: "Genuine ink, toner and drum units matched to your machine.",
    meta: `${countIn("inks-toner")} supplies`,
  },
];

export const partners = ["Printa", "Corex", "Nordjet", "Kopira", "Vantix"];

export const heroStats = [
  { value: "A4 – A0", label: "Printers & copiers" },
  { value: "Genuine", label: "Ink & toner" },
  { value: "Same day", label: "Dispatch on stock items" },
];

export const featuredFilters = [
  { key: "all", label: "All equipment" },
  { key: "printer", label: "Printers" },
  { key: "copier", label: "Photocopiers" },
  { key: "ink", label: "Inks & Toner" },
] as const;

const byId = (id: string) => catalogProducts.find((p) => p.id === id)!;

export const featured: Product[] = [
  "printa-tank-500",
  "corex-laser-450c",
  "nordjet-lf-44",
  "kopira-office-35",
  "kopira-pro-a3-30c",
  "vantix-production-60",
  "printa-ink-black",
  "corex-toner-210-hy",
  "kopira-toner-a3-black",
].map(byId);

export const arrivals = [
  {
    id: "nordjet-pro-a3",
    tag: "Just in · A3 colour",
    name: "Nordjet Pro A3 Colour Inkjet",
    note: "Pigment inks · Wi-Fi and Ethernet",
    price: byId("nordjet-pro-a3").price,
    action: "btn.view_printer",
    icon: "lucide:printer",
    image: "/img/prod-04.png",
    imageAlt: "Nordjet Pro A3 colour inkjet printer",
  },
  {
    id: "kopira-pro-a3-35",
    tag: "Back in stock · A3 mono",
    name: "Kopira Pro A3 35 ppm Mono",
    note: "Copy, print, scan and fax · installation included",
    price: byId("kopira-pro-a3-35").price,
    action: "btn.view_photocopier",
    icon: "lucide:copy",
    image: "/img/prod-04.png",
    imageAlt: "Kopira Pro A3 35 ppm photocopier",
  },
  {
    id: "corex-toner-210-hy",
    tag: "Best value · High-yield",
    name: "Corex Toner Black 210 High-Yield",
    note: "6,000 pages · lowers the cost per page",
    price: byId("corex-toner-210-hy").price,
    action: "btn.add_toner",
    icon: "lucide:droplets",
    image: "/img/prod-04.png",
    imageAlt: "Corex high-yield black toner cartridge",
  },
];

export const valueProps = [
  {
    icon: "lucide:truck",
    title: "Delivery & installation",
    body: "Photocopiers and large printers arrive installed, connected and tested.",
  },
  {
    icon: "lucide:shield-check",
    title: "Maintenance contracts",
    body: "Scheduled servicing, parts and on-site repairs for your machines.",
  },
  {
    icon: "lucide:clipboard-check",
    title: "Matched supplies",
    body: "Every ink and toner lists the exact models it fits.",
  },
  {
    icon: "lucide:headset",
    title: "Technician support",
    body: "Talk to a technician who knows your machine, not a call-centre script.",
  },
];

export const trust = [
  {
    icon: "lucide:shield",
    title: "Manufacturer warranty",
    body: "Every printer and photocopier is covered from the day it is delivered.",
  },
  {
    icon: "lucide:repeat",
    title: "Trade-in credit",
    body: "Put the value of your old printer or photocopier toward a new one.",
  },
  {
    icon: "lucide:badge-check",
    title: "Genuine supplies",
    body: "Original ink, toner and drum units, never refilled or relabelled.",
  },
  {
    icon: "lucide:wallet",
    title: "Lease & instalments",
    body: "Spread the cost of larger machines with monthly payments.",
  },
];

export const footerColumns = [
  {
    title: "Printers & Copiers",
    links: [
      { label: "Printers", to: "/products/printers" },
      { label: "Photocopiers", to: "/products/photocopiers" },
      { label: "Choosing a printer", to: "/guides/choosing-a-printer" },
      { label: "Choosing a photocopier", to: "/guides/choosing-a-photocopier" },
    ],
  },
  {
    title: "Inks & Toner",
    links: [
      { label: "Shop inks & toner", to: "/products/inks-toner" },
      { label: "Compatibility guide", to: "/guides/ink-toner-compatibility" },
      { label: "Print Lab service", to: "/printing" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Maintenance contracts", to: "/services/maintenance-contracts" },
      { label: "Trade-in", to: "/services/trade-in" },
      { label: "Financing", to: "/services/financing" },
      { label: "Shipping & delivery", to: "/services/shipping-delivery" },
    ],
  },
];
