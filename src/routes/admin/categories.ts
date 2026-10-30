import { Router } from "express";
import {
  checkCategory,
  createCategory,
  deleteCategory,
  findCategory,
  listCategories,
  reorderCategories,
  updateCategory,
  validateCategory,
} from "~/data/admin-categories";
import { handler, httpError, param } from "../../lib/http";

export const categoriesRouter = Router();

categoriesRouter.get("/", handler(() => listCategories()));

categoriesRouter.post(
  "/",
  handler((req, res) => {
    const input = validateCategory(req.body);
    if (!input) throw httpError(400, "Invalid category");
    const check = checkCategory(input);
    if (check === "slug") throw httpError(409, "Slug already in use");
    if (check === "parent") throw httpError(400, "Invalid parent");
    res.status(201);
    return createCategory(input);
  }),
);

// Saves the order of one sibling group: { parentId: string | null, ids: string[] }.
// Static path: must stay ahead of /:id.
categoriesRouter.post(
  "/reorder",
  handler((req) => {
    const body = req.body as { parentId?: unknown; ids?: unknown } | null;
    const parentId = typeof body?.parentId === "string" ? body.parentId : null;
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
    if (!ids.length || ids.length > 100 || !reorderCategories(parentId, ids)) throw httpError(400, "Invalid order");
    return { ok: true };
  }),
);

categoriesRouter.patch(
  "/:id",
  handler((req) => {
    const id = param(req, "id");
    if (!findCategory(id)) throw httpError(404, "Category not found");
    const input = validateCategory(req.body);
    if (!input) throw httpError(400, "Invalid category");
    const check = checkCategory(input, id);
    if (check === "slug") throw httpError(409, "Slug already in use");
    if (check === "parent") throw httpError(400, "Invalid parent");
    return updateCategory(id, input);
  }),
);

categoriesRouter.delete(
  "/:id",
  handler((req) => {
    const id = param(req, "id");
    if (!findCategory(id)) throw httpError(404, "Category not found");
    return { deleted: deleteCategory(id) };
  }),
);
