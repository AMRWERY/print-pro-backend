import { Router } from "express";
import {
  createProductFromForm,
  deleteProducts,
  findProduct,
  getProductDetail,
  parseProductsQuery,
  queryProducts,
  skuExists,
  updateProduct,
  updateProductFromForm,
  validateProductForm,
} from "~/data/admin-products";
import { handler, httpError, param } from "../../lib/http";

export const productsRouter = Router();

productsRouter.get(
  "/",
  handler((req) => queryProducts(parseProductsQuery(req.query as Record<string, unknown>))),
);

productsRouter.post(
  "/",
  handler((req, res) => {
    const values = validateProductForm(req.body);
    if (!values) throw httpError(400, "Invalid product");
    if (skuExists(values.sku)) throw httpError(409, "SKU already exists");
    res.status(201);
    return createProductFromForm(values);
  }),
);

// Static path: must stay ahead of /:id.
productsRouter.post(
  "/bulk-delete",
  handler((req) => {
    const body = req.body as { ids?: unknown } | null;
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
    if (!ids.length || ids.length > 100) throw httpError(400, "Invalid selection");
    return { deleted: deleteProducts(ids) };
  }),
);

productsRouter.get(
  "/:id",
  handler((req) => {
    const detail = getProductDetail(param(req, "id"));
    if (!detail) throw httpError(404, "Product not found");
    return detail;
  }),
);

// Edits a product. Send the whole editor form, or just `{ stock }` for a quick stock adjustment.
productsRouter.patch(
  "/:id",
  handler((req) => {
    const id = param(req, "id");
    if (!findProduct(id)) throw httpError(404, "Product not found");

    const body = (req.body ?? {}) as Record<string, unknown>;
    const keys = Object.keys(body);

    if (keys.length === 1 && keys[0] === "stock") {
      const stock = Number(body.stock);
      if (!Number.isInteger(stock) || stock < 0 || stock > 100_000) throw httpError(400, "Invalid stock");
      return updateProduct(id, { stock });
    }

    // Fields that are not sent keep their current value.
    const values = validateProductForm({ ...getProductDetail(id), ...body });
    if (!values) throw httpError(400, "Invalid product");
    if (skuExists(values.sku, id)) throw httpError(409, "SKU already exists");
    return updateProductFromForm(id, values);
  }),
);

productsRouter.delete(
  "/:id",
  handler((req) => {
    if (!deleteProducts([param(req, "id")])) throw httpError(404, "Product not found");
    return { deleted: 1 };
  }),
);
