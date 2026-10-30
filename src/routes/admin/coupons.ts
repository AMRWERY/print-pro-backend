import { Router } from "express";
import {
  bulkCoupons,
  codeTaken,
  createCoupon,
  findCoupon,
  isBulkAction,
  parseCouponQuery,
  queryCoupons,
  updateCoupon,
  validateCoupon,
} from "~/data/admin-coupons";
import { handler, httpError, param } from "../../lib/http";

export const couponsRouter = Router();

couponsRouter.get(
  "/",
  handler((req) => queryCoupons(parseCouponQuery(req.query))),
);

couponsRouter.post(
  "/",
  handler((req, res) => {
    const input = validateCoupon(req.body);
    if (!input) throw httpError(400, "Invalid coupon");
    if (codeTaken(input.code)) throw httpError(409, "Code already in use");
    res.status(201);
    return createCoupon(input);
  }),
);

// Pause, resume, archive or delete several coupons at once: { ids: string[], action }.
couponsRouter.post(
  "/bulk",
  handler((req) => {
    const body = req.body as { ids?: unknown; action?: unknown } | null | undefined;
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
    if (!ids.length || ids.length > 100 || !isBulkAction(body?.action)) throw httpError(400, "Invalid request");
    return { changed: bulkCoupons(ids, body.action) };
  }),
);

couponsRouter.patch(
  "/:id",
  handler((req) => {
    const id = param(req, "id");
    if (!findCoupon(id)) throw httpError(404, "Coupon not found");
    const input = validateCoupon(req.body);
    if (!input) throw httpError(400, "Invalid coupon");
    if (codeTaken(input.code, id)) throw httpError(409, "Code already in use");
    return updateCoupon(id, input);
  }),
);

couponsRouter.delete(
  "/:id",
  handler((req) => {
    if (!bulkCoupons([param(req, "id")], "delete")) throw httpError(404, "Coupon not found");
    return { deleted: 1 };
  }),
);
