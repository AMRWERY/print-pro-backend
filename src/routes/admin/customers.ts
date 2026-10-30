import { Router } from "express";
import {
  addCustomerNote,
  createCustomer,
  customerDetail,
  deleteCustomers,
  emailTaken,
  findCustomer,
  parseCustomerQuery,
  queryCustomers,
  updateCustomer,
  validateCustomer,
} from "~/data/admin-customers";
import { handler, httpError, param } from "../../lib/http";

export const customersRouter = Router();

customersRouter.get(
  "/",
  handler((req) => queryCustomers(parseCustomerQuery(req.query as Record<string, unknown>))),
);

customersRouter.post(
  "/",
  handler((req, res) => {
    const input = validateCustomer(req.body);
    if (!input) throw httpError(400, "Invalid client");
    if (emailTaken(input.email)) throw httpError(409, "Email already registered");
    res.status(201);
    return createCustomer(input);
  }),
);

// Static path: registered before "/:id".
customersRouter.post(
  "/bulk-delete",
  handler((req) => {
    const body = req.body as { ids?: unknown } | null | undefined;
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
    if (!ids.length || ids.length > 100) throw httpError(400, "Invalid selection");
    return { deleted: deleteCustomers(ids) };
  }),
);

customersRouter.get(
  "/:id",
  handler((req) => {
    const detail = customerDetail(param(req, "id"));
    if (!detail) throw httpError(404, "Client not found");
    return detail;
  }),
);

customersRouter.patch(
  "/:id",
  handler((req) => {
    const id = param(req, "id");
    if (!findCustomer(id)) throw httpError(404, "Client not found");
    const input = validateCustomer(req.body);
    if (!input) throw httpError(400, "Invalid client");
    if (emailTaken(input.email, id)) throw httpError(409, "Email already registered");
    updateCustomer(id, input);
    return customerDetail(id);
  }),
);

customersRouter.delete(
  "/:id",
  handler((req) => {
    if (!deleteCustomers([param(req, "id")])) throw httpError(404, "Client not found");
    return { deleted: 1 };
  }),
);

customersRouter.post(
  "/:id/notes",
  handler((req, res) => {
    const id = param(req, "id");
    const body = req.body as { text?: unknown; urgent?: unknown } | null | undefined;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (text.length < 1 || text.length > 600) throw httpError(400, "Invalid note");
    if (!addCustomerNote(id, text, body?.urgent === true)) throw httpError(404, "Client not found");
    res.status(201);
    return customerDetail(id);
  }),
);
