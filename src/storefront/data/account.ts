import type {
  AtelierProfile,
  AuditLogEntry,
  CompanionProduct,
  ReceivingDock,
  RegistryItem,
  RequisitionOrder,
} from "~/types/account";

export const defaultAtelierProfile: AtelierProfile = {
  id: "PP-ACC-0001",
  name: "Amr Mohamed",
  title: "Operations Manager",
  affiliation: "Delta Architects",
  tierTag: "BUSINESS ACCOUNT // CAIRO",
  tierName: "Business account",
  metrologyId: "PP-ACC-0001",
  avatarUrl: "/img/user-01.png",
  escrowLimit: 45000,
  escrowAvailable: 12450,
  auditSyncTime: "Today 09:15",
  proofDrift: "99% on-time deliveries",
  cleanroomDock: "Head office (Cairo)",
  cleanroomSpecs: "Weekdays 08:00 – 17:00",
  securityAuth: "Authenticator app",
  securityStatus: "Two-step sign-in is on",
  deltaEAvg: 0.45,
  chamberHumidity: 45,
  chamberPressure: 100,
};

export const defaultOrders: RequisitionOrder[] = [
  {
    id: "#LP-948201",
    crateId: "ORDER #LP-948201",
    title:
      "Kopira Pro A3 35 ppm Mono + Kopira Toner Black A3 Series (6 cartridges)",
    status: "in-transit",
    statusLabel: "ON THE WAY",
    badgeLabel: "DELIVERY & INSTALLATION",
    waybill: "PP-DEL-948201",
    dispatchedFrom: "PrintPro warehouse, Cairo - 26 OCT",
    destination: "HEAD OFFICE, CAIRO",
    traceTelemetry: "Out for delivery, installation booked for 28 OCT",
    flight: {
      code: "Courier #4821",
      route: "Warehouse -> Head office",
      altitude: "34 km",
      cargoTemp: "3 parcels",
      humidity: "186 kg",
      status: "ON TIME",
      currentStageIndex: 2,
      stages: ["Confirmed", "Packed", "On the way", "Delivered"],
      gForce: "Sealed",
    },
    amount: 79700,
    items: [
      {
        name: "Kopira Pro A3 35 ppm Mono",
        thumb: "/img/prod-01.png",
        sku: "PP-KP-A335",
        quantity: 1,
      },
      {
        name: "Kopira Toner Black A3 Series",
        thumb: "/img/prod-02.png",
        sku: "PP-TN-KAB",
        quantity: 6,
      },
    ],
  },
  {
    id: "#LP-883109",
    title: "Corex Laser 450 Colour + Corex Toner Colour Set 450",
    status: "delivered",
    statusLabel: "DELIVERED & INSTALLED",
    badgeLabel: "TESTED BEFORE DISPATCH",
    date: "18 Oct 2025",
    serial: "CX-450-2210-AH21",
    dispatchedFrom: "PrintPro warehouse, Cairo",
    benchVerified: "Test page printed before dispatch",
    amount: 20100,
    items: [
      {
        name: "Corex Laser 450 Colour",
        thumb: "/img/prod-01.png",
        sku: "PP-CX-0450",
        quantity: 1,
      },
      {
        name: "Corex Toner Colour Set 450 (C/M/Y/K)",
        thumb: "/img/prod-04.png",
        sku: "PP-TN-C45S",
        quantity: 1,
      },
    ],
  },
  {
    id: "#LP-810442",
    title: "Nordjet Pro A3 Colour Inkjet + Nordjet Pigment Ink 8-Colour Set",
    status: "archived",
    statusLabel: "COMPLETED",
    date: "02 Sep 2025",
    calibrationLog: "Installed and tested on site. Service note: SV-2025-3318",
    amount: 23400,
    items: [
      {
        name: "Nordjet Pro A3 Colour Inkjet",
        thumb: "/img/prod-02.png",
        sku: "PP-NJ-0A3",
        quantity: 1,
      },
      {
        name: "Nordjet Pigment Ink 8-Colour Set 130 ml",
        thumb: "/img/prod-04.png",
        sku: "PP-IK-NP8",
        quantity: 1,
      },
    ],
  },
];

export const highVolumeExtraOrders: RequisitionOrder[] = [
  {
    id: "#LP-948190",
    title: "Kopira Pro A3 45 ppm Colour + finisher",
    status: "in-transit",
    statusLabel: "ON THE WAY",
    badgeLabel: "DELIVERY & INSTALLATION",
    waybill: "PP-DEL-948190",
    dispatchedFrom: "PrintPro warehouse, Cairo",
    destination: "BRANCH OFFICE, GIZA",
    amount: 126900,
    items: [
      {
        name: "Kopira Pro A3 45 ppm Colour",
        thumb: "/img/prod-08.png",
        sku: "PP-KP-A34C",
      },
    ],
  },
  {
    id: "#LP-947992",
    title: "Nordjet LF Ink Cartridges, mixed colours (24 cartridges)",
    status: "in-transit",
    statusLabel: "ON THE WAY",
    badgeLabel: "SUPPLIES ORDER",
    waybill: "PP-DEL-947992",
    dispatchedFrom: "PrintPro warehouse, Cairo",
    destination: "HEAD OFFICE, CAIRO",
    amount: 34800,
    items: [
      {
        name: "Nordjet LF Ink Cartridge Black 300 ml",
        thumb: "/img/prod-09.png",
        sku: "PP-IK-NLK",
      },
    ],
  },
];

export const defaultRegistryItems: RegistryItem[] = [
  {
    id: "corex-laser-700-a3",
    name: "Corex Laser 700 A3 Mono",
    category: "Printer",
    statusBadge: "IN STOCK",
    specNotes: "A3 mono laser // 40 ppm // Ethernet",
    price: 27400,
    image: "/img/prod-05.png",
    icon: "lucide:printer",
    units: 1,
  },
  {
    id: "kopira-office-35",
    name: "Kopira Office 35 A4 Mono MFP",
    category: "Photocopier",
    statusBadge: "2 UNITS • QUOTE REQUESTED",
    specNotes: "35 ppm // Copy, print, scan // Delivery and installation",
    price: 18900,
    image: "/img/prod-01.png",
    icon: "lucide:copy",
    units: 2,
  },
  {
    id: "printa-ink-colour-set",
    name: "Printa Tank Ink Colour Set (C/M/Y)",
    category: "Ink",
    statusBadge: "IN STOCK • 7,000 PAGES",
    specNotes: "3 × 70 ml // Fits Printa Tank 500",
    price: 780,
    image: "/img/prod-06.png",
    icon: "lucide:droplets",
    units: 1,
  },
];

export const defaultReceivingDocks: ReceivingDock[] = [
  {
    id: "dock-cairo-hq",
    name: "Head office • Cairo",
    code: "CAI-HQ-01",
    typeBadge: "DEFAULT ADDRESS",
    clearanceBadge: "SIGNATURE REQUIRED",
    address:
      "12 Tahrir Street, Dokki, Cairo 12311 — Loading bay at the rear — ATTN: Amr Mohamed",
    climateSpecs: "Use the loading bay at the rear",
    securityClearance: "WEEKDAYS 08:00-17:00",
    telemetry: "Mon–Fri · 08:00–17:00",
    bondedAgent: "Mona, reception",
    isPrimary: true,
  },
  {
    id: "dock-giza-branch",
    name: "Branch office • Giza",
    code: "GIZ-BR-02",
    typeBadge: "SECONDARY ADDRESS",
    clearanceBadge: "CALL ON ARRIVAL",
    address: "45 Pyramids Road, Giza 12556 — Ground floor reception",
    climateSpecs: "Call the contact person on arrival",
    securityClearance: "BY APPOINTMENT",
    telemetry: "Sun–Thu · 09:00–16:00",
    bondedAgent: "Karim, office manager",
    isPrimary: false,
  },
];

export const defaultAuditLogs: AuditLogEntry[] = [
  {
    id: "audit-01",
    title: "ORDER DELIVERED",
    timestamp: "09:43",
    summary:
      "Corex Laser 450 Colour was delivered and installed at your head office. Test page printed.",
    hash: "ORDER #LP-883109",
    category: "qa",
    severity: "verified",
  },
  {
    id: "audit-02",
    title: "ACCOUNT CREDIT ADDED",
    timestamp: "08:14",
    summary:
      "A payment of EGP 45,000 was received and added to your account credit.",
    hash: "PAYMENT REF: PP-PAY-99374",
    category: "escrow",
    severity: "nominal",
  },
  {
    id: "audit-03",
    title: "NEW SIGN-IN",
    timestamp: "YESTERDAY",
    summary:
      "Your account was signed in from a new browser in Cairo. If this was not you, change your password.",
    hash: "TWO-STEP SIGN-IN: PASSED",
    category: "security",
    severity: "action",
  },
  {
    id: "audit-04",
    title: "SERVICE VISIT COMPLETED",
    timestamp: "24 OCT",
    summary:
      "A technician serviced the Kopira Pro A3 and replaced the drum unit. The service report is attached to your order.",
    hash: "SERVICE REPORT: SV-2026-4410",
    category: "metrology",
    severity: "verified",
  },
];

export const defaultCompanionProducts: CompanionProduct[] = [
  {
    id: "nordjet-pigment-set",
    name: "Nordjet Pigment Ink 8-Colour Set 130 ml",
    tag: "FOR NORDJET PRO A3",
    badge: "SUPPLIES • INK",
    description: "Full pigment set for fade-resistant A3 colour prints.",
    price: 4900,
    image: "/img/prod-09.png",
    icon: "lucide:droplets",
  },
  {
    id: "corex-toner-210-hy",
    name: "Corex Toner Black 210 High-Yield",
    tag: "FOR COREX LASER 210",
    badge: "SUPPLIES • TONER",
    description:
      "6,000 pages per cartridge, which lowers the cost of each page.",
    price: 2100,
    image: "/img/prod-06.png",
    icon: "lucide:droplets",
  },
  {
    id: "kopira-drum-a3",
    name: "Kopira Drum Unit A3 Series",
    tag: "FOR KOPIRA PRO A3",
    badge: "SUPPLIES • DRUM",
    description: "Replacement drum for clean copies, rated for 100,000 pages.",
    price: 6400,
    image: "/img/prod-07.png",
    icon: "lucide:cylinder",
  },
  {
    id: "vantix-production-toner",
    name: "Vantix Production Toner Black",
    tag: "FOR VANTIX PRODUCTION",
    badge: "SUPPLIES • TONER",
    description: "High-volume black toner for production systems.",
    price: 5600,
    image: "/img/prod-08.png",
    icon: "lucide:droplets",
  },
];

export const complianceSections = [
  {
    title: "WARRANTY",
    body: "Every printer and photocopier carries the manufacturer's warranty from the day it is delivered. Extended cover is available with a maintenance contract.",
    code: "WARRANTY & RETURNS",
  },
  {
    title: "SERVICE & SUPPORT",
    body: "Technicians are available on weekdays from 08:00 to 18:00. Maintenance contract customers receive a next-working-day response.",
    code: "SUPPORT: support@printpro.com",
  },
  {
    title: "DELIVERY",
    body: "Supplies ship by insured courier. Photocopiers and large printers are delivered, installed and tested by our technicians.",
    code: "SHIPPING & DELIVERY",
  },
  {
    title: "PRIVACY",
    body: "We keep your account details and order history secure and never sell your personal data. You can export or delete your data at any time.",
    code: "PRIVACY & TERMS",
  },
];