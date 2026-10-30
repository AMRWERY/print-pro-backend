import { Router } from "express";
import { analyticsRouter } from "./analytics";
import { categoriesRouter } from "./categories";
import { contentRouter } from "./content";
import { couponsRouter } from "./coupons";
import { customersRouter } from "./customers";
import { dashboardRouter } from "./dashboard";
import { inventoryRouter } from "./inventory";
import { ordersRouter } from "./orders";
import { productsRouter } from "./products";
import { settingsRouter } from "./settings";

/** Mounted at /api/admin behind requireRole("admin"). */
export const adminRouter = Router();
adminRouter.use("/analytics", analyticsRouter);
adminRouter.use("/categories", categoriesRouter);
adminRouter.use("/content", contentRouter);
adminRouter.use("/coupons", couponsRouter);
adminRouter.use("/customers", customersRouter);
adminRouter.use("/inventory", inventoryRouter);
adminRouter.use("/orders", ordersRouter);
adminRouter.use("/products", productsRouter);
adminRouter.use("/settings", settingsRouter);
// dashboard.get and revenue.get live at /api/admin/dashboard and /api/admin/revenue
adminRouter.use("/", dashboardRouter);
