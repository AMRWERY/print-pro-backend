import { defaultOrders } from "~/storefront/data/account";
import type { RequisitionOrder } from "~/types/account";

// Demo order history shown alongside orders placed through checkout. When the app has a
// backend this file goes away and the list comes from the API.

const placedAt: Record<string, string> = {
  "#LP-948201": "2025-10-26T14:15:00",
  "#LP-883109": "2025-10-18T16:40:00",
  "#LP-810442": "2025-09-02T11:22:00",
  "#LP-770412": "2025-08-29T09:00:00",
  "#LP-694205": "2025-08-18T14:15:00",
};

const extra: RequisitionOrder[] = [
  {
    id: "#LP-770412",
    title: "Vantix Production 75 ppm Colour",
    status: "recalled",
    statusLabel: "REFUNDED / CANCELLED",
    badgeLabel: "ORDER CANCELLED",
    amount: 289000,
    items: [
      {
        name: "Vantix Production 75 ppm Colour",
        thumb: "/img/prod-08.png",
        sku: "PP-VX-P75C",
        quantity: 1,
      },
    ],
  },
  {
    id: "#LP-694205",
    title: "Corex Toner Black 210 High-Yield (6 cartridges)",
    status: "delivered",
    statusLabel: "DELIVERED",
    badgeLabel: "GENUINE SUPPLIES",
    amount: 12600,
    items: [
      {
        name: "Corex Toner Black 210 High-Yield",
        thumb: "/img/prod-06.png",
        sku: "PP-TN-C21H",
        quantity: 6,
      },
    ],
  },
];

/** The five-order demo history, in the order the designs list them. */
export const demoOrderHistory = (): RequisitionOrder[] =>
  [...defaultOrders, ...extra].map((o) => ({ ...o, placedAt: placedAt[o.id] }));
