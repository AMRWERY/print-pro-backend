import { Router } from "express";
import {
  createBlock,
  deleteBlock,
  findBlock,
  parseBlockQuery,
  queryBlocks,
  reorderBlocks,
  setBlockStatus,
  updateBlock,
  validateBlock,
} from "~/data/admin-content";
import { handler, httpError, param } from "../../lib/http";

export const contentRouter = Router();

contentRouter.get(
  "/",
  handler((req) => queryBlocks(parseBlockQuery(req.query))),
);

contentRouter.post(
  "/",
  handler((req, res) => {
    const input = validateBlock(req.body);
    if (!input) throw httpError(400, "Invalid content block");
    res.status(201);
    return createBlock(input);
  }),
);

// Pretends to purge the storefront edge cache so new content shows at once.
contentRouter.post(
  "/flush",
  handler(() => ({ flushedAt: new Date().toISOString() })),
);

// Put the given blocks in a new order, within the positions they already hold: { ids: string[] }.
contentRouter.post(
  "/reorder",
  handler((req) => {
    const body = req.body as { ids?: unknown } | null | undefined;
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
    if (ids.length < 2 || ids.length > 100 || !reorderBlocks(ids)) throw httpError(400, "Invalid order");
    return { ok: true };
  }),
);

// Publish or unpublish one block: { status: "published" | "draft" }.
contentRouter.post(
  "/:id/status",
  handler((req) => {
    const body = req.body as { status?: unknown } | null | undefined;
    if (body?.status !== "published" && body?.status !== "draft") throw httpError(400, "Invalid status");
    const row = setBlockStatus(param(req, "id"), body.status);
    if (!row) throw httpError(404, "Content block not found");
    return row;
  }),
);

contentRouter.patch(
  "/:id",
  handler((req) => {
    const id = param(req, "id");
    if (!findBlock(id)) throw httpError(404, "Content block not found");
    const input = validateBlock(req.body);
    if (!input) throw httpError(400, "Invalid content block");
    return updateBlock(id, input);
  }),
);

contentRouter.delete(
  "/:id",
  handler((req) => {
    if (!deleteBlock(param(req, "id"))) throw httpError(404, "Content block not found");
    return { deleted: 1 };
  }),
);
