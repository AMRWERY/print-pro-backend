import { Router } from "express";
import {
  adjustStock,
  createItem,
  deleteItem,
  listMovements,
  parseInventoryQuery,
  pickerSearch,
  queryInventory,
  receiveConsignment,
  transferItem,
  updateItem,
  type ChangeResult,
} from "~/data/admin-inventory";
import { handler, httpError, param } from "../../lib/http";

export const inventoryRouter = Router();

/** Unwraps a data-layer result: the changed item, or the HTTP error it describes. */
const unwrap = (result: ChangeResult) => {
  if (!result.ok) throw httpError(result.status, result.message);
  return result.item;
};

inventoryRouter.get(
  "/",
  handler((req) => queryInventory(parseInventoryQuery(req.query))),
);

inventoryRouter.get(
  "/movements",
  handler((req) => listMovements(Number(req.query.limit) || 8)),
);

// Product lookup for the stock dialogs.
inventoryRouter.get(
  "/search",
  handler((req) => {
    const q = req.query.q;
    return pickerSearch(typeof q === "string" ? q : "");
  }),
);

inventoryRouter.post(
  "/adjust",
  handler((req) => unwrap(adjustStock(req.body))),
);

inventoryRouter.post(
  "/receive",
  handler((req) => unwrap(receiveConsignment(req.body))),
);

inventoryRouter.post(
  "/transfer",
  handler((req) => unwrap(transferItem(req.body))),
);

inventoryRouter.post(
  "/items",
  handler((req, res) => {
    const item = unwrap(createItem(req.body));
    res.status(201);
    return item;
  }),
);

inventoryRouter.patch(
  "/items/:id",
  handler((req) => unwrap(updateItem(param(req, "id"), req.body))),
);

inventoryRouter.delete(
  "/items/:id",
  handler((req) => {
    if (!deleteItem(param(req, "id")).ok) throw httpError(404, "Item not found");
    return { deleted: 1 };
  }),
);
