import { Router } from "express";
import { buildAnalytics, parseAnalyticsQuery, parseTopQuery, queryTopProducts } from "~/data/admin-analytics";
import { handler } from "../../lib/http";

export const analyticsRouter = Router();

analyticsRouter.get(
  "/",
  handler((req) => buildAnalytics(parseAnalyticsQuery(req.query as Record<string, unknown>))),
);

analyticsRouter.get(
  "/top-products",
  handler((req) => queryTopProducts(parseTopQuery(req.query as Record<string, unknown>))),
);
