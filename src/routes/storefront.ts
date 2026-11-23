import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../config";
import { get } from "../db";
import { handler, httpError, param } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { adminPictures, findCatalogEntry, findSellable, listCatalog, pictureData } from "../storefront/catalog";
import { getProductDetail } from "../storefront/data/product-details";
import { findOrderFor, orderBody, ordersOfUser, placeOrder, quoteVoucher } from "../storefront/orders";
import type { RequisitionOrder } from "~/types/account";
import type { Order } from "~/types/order";

export const storefrontRouter = Router();

const limiter = (limit: number, windowMs = 15 * 60_000) =>
  rateLimit({
    windowMs,
    limit: config.production ? limit : limit * 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { statusCode: 429, message: "Too many requests. Try again later." },
  });

storefrontRouter.get(
  "/catalog",
  handler(() => listCatalog()),
);

// A product photo as a real image, so lists stay light and browsers can cache it.
storefrontRouter.get("/media/:id/:n", (req, res, next) => {
  const data = pictureData(param(req, "id"), Number.parseInt(param(req, "n"), 10));
  const m = data?.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return next(httpError(404, "Not found"));
  res
    .set({ "Content-Type": m[1]!, "Cache-Control": "public, max-age=31536000, immutable", "Cross-Origin-Resource-Policy": "cross-origin" })
    .send(Buffer.from(m[2]!, "base64"));
});

storefrontRouter.get(
  "/products/:id",
  handler((req) => {
    const id = param(req, "id");
    const product = findSellable(id);
    if (!product) throw httpError(404, "Product not found");
    const base = getProductDetail(product);
    // Photos uploaded in admin replace the stand-in views.
    const adminId = findCatalogEntry(id)?.adminId;
    const photos = adminId ? adminPictures(adminId, product.name) : [];
    const detail = photos.length
      ? { ...base, gallery: photos.map((p, i) => ({ label: i === 0 ? "Cover" : `View ${i + 1}`, src: p.src, alt: p.alt })) }
      : base;
    const related = detail.related
      .map((rid) => findSellable(rid))
      .filter((p): p is NonNullable<typeof p> => !!p);
    return { product, detail, related };
  }),
);

// What a cart would cost with a voucher, before checkout. Same arithmetic the order uses.
storefrontRouter.post(
  "/cart/quote",
  limiter(200),
  handler((req) => {
    const body = z
      .object({ items: orderBody.shape.items, voucher: z.string().trim().max(40), delivery: orderBody.shape.delivery.default("crated") })
      .safeParse(req.body);
    if (!body.success) throw httpError(400, body.error.issues[0]?.message ?? "Invalid request");
    return quoteVoucher(body.data.items, body.data.voucher, body.data.delivery);
  }),
);

storefrontRouter.post(
  "/orders",
  limiter(30),
  handler(async (req, res) => {
    const body = orderBody.safeParse(req.body);
    if (!body.success) throw httpError(400, body.error.issues[0]?.message ?? "Invalid order");
    const user = req.user?.role === "customer" ? { id: req.user.id, tier: await tierOf(req.user.id) } : undefined;
    const order = placeOrder(body.data, user);
    res.status(201);
    return order;
  }),
);

const tierOf = async (userId: string) => (await get<{ tier: string }>("SELECT tier FROM users WHERE id = ?", [userId]))?.tier;

// A signed-in owner sees their order; anyone else needs the PIN from the confirmation. A wrong id and a wrong PIN look the same.
storefrontRouter.get(
  "/orders/:id",
  limiter(60),
  handler((req) => {
    const pin = typeof req.query.pin === "string" ? req.query.pin : undefined;
    const order = findOrderFor(param(req, "id"), { userId: req.user?.id, pin });
    if (!order) throw httpError(404, "Order not found");
    return order;
  }),
);

const statusOf = (o: Order): Pick<RequisitionOrder, "status" | "statusLabel"> => {
  const hours = (Date.now() - Date.parse(o.createdAt)) / 3_600_000;
  return hours > o.delivery.days * 24 + 24
    ? { status: "delivered", statusLabel: "DELIVERED" }
    : { status: "processing", statusLabel: "BEING PREPARED" };
};

// The signed-in customer's own orders, in the shape the account page lists.
storefrontRouter.get(
  "/account/orders",
  requireAuth,
  handler((req): RequisitionOrder[] =>
    ordersOfUser(req.user!.id).map((o) => ({
      id: `#${o.id}`,
      title: o.items.map((i) => i.name).join(" + "),
      ...statusOf(o),
      badgeLabel: o.delivery.label.toUpperCase(),
      amount: o.amounts.total,
      placedAt: o.createdAt,
      real: true,
      items: o.items.map((i) => ({ name: i.name, thumb: i.image, icon: i.icon, sku: i.sku, quantity: i.qty })),
    })),
  ),
);
