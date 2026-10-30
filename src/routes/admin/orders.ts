import { Router } from "express";
import {
  addOrderNote,
  createOrder,
  isOrderSlug,
  isOrderStage,
  orderDetail,
  parseOrdersQuery,
  queryOrders,
  setOrderStage,
  validateCreateOrder,
} from "~/data/admin-orders";
import { handler, httpError, param } from "../../lib/http";

export const ordersRouter = Router();

ordersRouter.get(
  "/",
  handler((req) => queryOrders(parseOrdersQuery(req.query as Record<string, unknown>))),
);

ordersRouter.post(
  "/",
  handler((req, res) => {
    const input = validateCreateOrder(req.body);
    if (!input) throw httpError(400, "Invalid order");
    res.status(201);
    return createOrder(input);
  }),
);

ordersRouter.get(
  "/:id",
  handler((req) => {
    const id = param(req, "id");
    if (!isOrderSlug(id)) throw httpError(400, "Invalid order ID");
    const detail = orderDetail(id);
    if (!detail) throw httpError(404, "Order not found");
    return detail;
  }),
);

// Moves an order to another pipeline stage (including completing the order).
ordersRouter.patch(
  "/:id",
  handler((req) => {
    const id = param(req, "id");
    const body = req.body as { stage?: unknown } | null | undefined;
    if (!isOrderSlug(id) || !isOrderStage(body?.stage)) throw httpError(400, "Invalid request");
    if (!setOrderStage(id, body.stage)) throw httpError(404, "Order not found");
    return orderDetail(id);
  }),
);

ordersRouter.post(
  "/:id/notes",
  handler((req, res) => {
    const id = param(req, "id");
    const body = req.body as { text?: unknown; urgent?: unknown } | null | undefined;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!isOrderSlug(id) || text.length < 1 || text.length > 600) throw httpError(400, "Invalid note");
    if (!addOrderNote(id, text, body?.urgent === true)) throw httpError(404, "Order not found");
    res.status(201);
    return orderDetail(id);
  }),
);
