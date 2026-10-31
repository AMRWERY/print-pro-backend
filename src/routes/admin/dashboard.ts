import { Router } from "express";
import { dashboardSummary, isRangeKey, revenueSeries } from "~/data/admin-dashboard";
import { handler, httpError } from "../../lib/http";

/** Mounted at /api/admin: serves /dashboard and /revenue. */
export const dashboardRouter = Router();

dashboardRouter.get(
  "/dashboard",
  handler(() => dashboardSummary()),
);

dashboardRouter.get(
  "/revenue",
  handler((req) => {
    const { range } = req.query;
    if (!isRangeKey(range)) throw httpError(400, "Unknown range");
    return revenueSeries(range);
  }),
);
