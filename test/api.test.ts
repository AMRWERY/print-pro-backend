import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

const dir = mkdtempSync(join(tmpdir(), "printpro-api-"));
process.env.NODE_ENV = "test";
process.env.DB_PATH = join(dir, "test.db");
process.env.SEED_ADMIN_EMAIL = "admin@test.dev";
process.env.SEED_ADMIN_PASSWORD = "Admin#Test-2026!";

let server: Server;
let base = "";

const call = async (method: string, path: string, opts: { token?: string; body?: unknown } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
};

const orderInput = (over: Record<string, unknown> = {}) => ({
  items: [{ id: "printa-home-300", qty: 1 }],
  contact: { name: "Test Buyer", email: "buyer@example.com", phone: "+201000000000" },
  address: { line1: "1 Nile St", city: "Cairo", region: "Cairo", postal: "11511", country: "EG" },
  delivery: "express",
  payment: { id: "vodafone" },
  ...over,
});

let adminToken = "";
let customerToken = "";

before(async () => {
  const { createApp } = await import("../src/app");
  const { boot } = await import("../src/boot");
  await boot();
  await new Promise<void>((resolve) => {
    server = createApp().listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

after(async () => {
  server.close();
  const { closeDb } = await import("../src/db");
  closeDb();
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Windows can keep the file locked for a moment; the OS cleans the temp folder later.
  }
});

describe("auth", () => {
  it("rejects a wrong password and unauthenticated admin calls", async () => {
    assert.equal((await call("POST", "/api/auth/login", { body: { email: "admin@test.dev", password: "nope-nope-nope" } })).status, 401);
    assert.equal((await call("GET", "/api/admin/products")).status, 401);
  });

  it("signs the admin in", async () => {
    const r = await call("POST", "/api/auth/login", { body: { email: "admin@test.dev", password: "Admin#Test-2026!", requireRole: "admin" } });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.role, "admin");
    assert.ok(!("hash" in r.body.user));
    adminToken = r.body.token;
  });

  it("registers a customer who cannot reach admin routes or sign in to the admin app", async () => {
    const reg = await call("POST", "/api/auth/register", {
      body: { name: "Cora Customer", email: "cora@example.com", password: "Str0ng!Passw0rd-x", tier: "home", newsletter: false },
    });
    assert.equal(reg.status, 201);
    customerToken = reg.body.token;
    assert.equal(reg.body.user.role, "customer");
    assert.equal((await call("GET", "/api/admin/products", { token: customerToken })).status, 403);
    const asAdmin = await call("POST", "/api/auth/login", { body: { email: "cora@example.com", password: "Str0ng!Passw0rd-x", requireRole: "admin" } });
    assert.equal(asAdmin.status, 401);
  });

  it("refuses to register a role or a weak password", async () => {
    const weak = await call("POST", "/api/auth/register", { body: { name: "X", email: "x@example.com", password: "short" } });
    assert.equal(weak.status, 400);
    const sneaky = await call("POST", "/api/auth/register", {
      body: { name: "Mallory", email: "mallory@example.com", password: "Str0ng!Passw0rd-x", role: "admin" },
    });
    assert.equal(sneaky.body.user.role, "customer");
  });

  it("saves, shows and removes a profile photo, and refuses anything that is not an image", async () => {
    const tiny = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=";
    const saved = await call("PATCH", "/api/auth/profile", { token: adminToken, body: { avatar: tiny } });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.user.avatar, tiny);
    assert.equal((await call("GET", "/api/auth/me", { token: adminToken })).body.user.avatar, tiny);

    // other edits keep the photo
    assert.equal((await call("PATCH", "/api/auth/profile", { token: adminToken, body: { title: "Owner" } })).body.user.avatar, tiny);

    assert.equal((await call("PATCH", "/api/auth/profile", { token: adminToken, body: { avatar: "data:text/html;base64,PHNjcmlwdD4=" } })).status, 400);
    assert.equal((await call("PATCH", "/api/auth/profile", { token: adminToken, body: { avatar: "https://evil.example/x.jpg" } })).status, 400);

    const removed = await call("PATCH", "/api/auth/profile", { token: adminToken, body: { avatar: "" } });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.user.avatar, undefined);
  });

  it("rejects a forged token", async () => {
    assert.equal((await call("GET", "/api/admin/products", { token: "not.a.token" })).status, 401);
  });
});

describe("categories", () => {
  it("seeds the three built-in categories with their keys and kinds", async () => {
    const r = await call("GET", "/api/admin/categories", { token: adminToken });
    assert.equal(r.status, 200);
    const nodes = r.body.nodes as { key: string; kind: string; parentId: string | null; skus: number }[];
    assert.deepEqual(nodes.map((n) => [n.key, n.kind]), [["printers", "printer"], ["copiers", "copier"], ["inks-toner", "supply"]]);
    assert.ok(nodes.every((n) => n.parentId === null && n.skus === 0));
  });

  it("fills in keys for stored categories that lack one", async () => {
    const { migrateCategories } = await import("../src/data/admin-categories");
    const base = { code: "C", parentId: null, order: 0, skus: 7, abstract: "", icon: "lucide:folder", megamenu: false, publicIndexing: false, facetRank: 3, defaultSort: "curated" };
    const legacy = [
      { ...base, id: "c-1", name: "My printers", slug: "/printers", visibility: "hidden" },
      { ...base, id: "c-2", name: "Scanners", slug: "/scanners", parentId: "c-1", visibility: "active" },
    ] as never;
    const out = migrateCategories(legacy);
    assert.deepEqual(out.map((c) => c.key).sort(), ["copiers", "inks-toner", "printers", "scanners"]);
    const printers = out.find((c) => c.key === "printers")!;
    assert.equal(printers.name, "My printers"); // the admin's edits are kept
    assert.equal(printers.visibility, "hidden");
    assert.equal(printers.kind, "printer");
    const scanners = out.find((c) => c.key === "scanners")!;
    assert.equal(scanners.kind, "general");
    assert.equal(scanners.parentId, null); // the list is flat now
  });

  const make = (name: string, slug: string, extra: Record<string, unknown> = {}) =>
    call("POST", "/api/admin/categories", { token: adminToken, body: { name, slug, visibility: "active", ...extra } });

  it("creates a flat category with a generated key and the kind it was given", async () => {
    const r = await make("Scanners", "/scanners", { parentId: "c-printers", kind: "printer" });
    assert.equal(r.status, 201);
    assert.equal(r.body.key, "scanners");
    assert.equal(r.body.parentId, null);
    // the kind is chosen when the category is created
    assert.equal(r.body.kind, "printer");
  });

  it("gives names without Latin letters numbered keys, and repeated names suffixed keys", async () => {
    assert.equal((await make("طابعات", "/a1")).body.key, "category-1");
    assert.equal((await make("حبر", "/a2")).body.key, "category-2");
    assert.equal((await make("Scanners", "/scanners-two")).body.key, "scanners-2");
  });

  it("keeps the key and kind when a category is renamed", async () => {
    const made = await make("Laminators", "/laminators");
    const patched = await call("PATCH", `/api/admin/categories/${made.body.id}`, {
      token: adminToken,
      body: { name: "Laminating", slug: "/laminators", visibility: "active", key: "hijack", kind: "copier" },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.name, "Laminating");
    assert.equal(patched.body.key, "laminators");
    assert.equal(patched.body.kind, "general");
  });

  it("refuses a malformed or taken key and a reserved word", async () => {
    const bad = await make("Bad", "/bad", { key: "Bad Key" });
    assert.equal(bad.status, 400);
    assert.ok(bad.body.fields.key);
    assert.equal((await make("Reserved", "/reserved", { key: "admin" })).status, 400);
    const taken = await make("Again", "/again", { key: "printers" });
    assert.equal(taken.status, 409);
    assert.ok(taken.body.fields.key);
  });

  it("blocks deleting a category that products use, and deletes an unused one", async () => {
    const product = await call("POST", "/api/admin/products", {
      token: adminToken,
      body: { name: "Guard Copier", sku: "GUARD-1", brand: "Kopira", category: "copiers", price: 10, stock: 1, min: 1, channels: [] },
    });
    assert.equal(product.status, 201);
    const copiers = (await call("GET", "/api/admin/categories", { token: adminToken })).body.nodes.find((n: { key: string }) => n.key === "copiers");
    assert.equal(copiers.skus, 1);
    const blocked = await call("DELETE", `/api/admin/categories/${copiers.id}`, { token: adminToken });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.message, "1 products use this category. Move them first.");
    const still = (await call("GET", "/api/admin/categories", { token: adminToken })).body.nodes;
    assert.ok(still.some((n: { key: string }) => n.key === "copiers"));

    const unused = still.find((n: { key: string }) => n.key === "laminators");
    assert.equal((await call("DELETE", `/api/admin/categories/${unused.id}`, { token: adminToken })).status, 200);
  });
});

describe("admin edits reach the storefront", () => {
  // The register starts empty: the storefront only sells what an admin has registered, linked by SKU.
  before(async () => {
    for (const [sku, name, price] of [
      ["PP-PR-0300", "Printa Home 300 Wireless Inkjet", 3200],
      ["PP-PR-0120", "Printa Mini Portable Inkjet", 2400],
    ] as const) {
      const r = await call("POST", "/api/admin/products", {
        token: adminToken,
        body: { name, sku, brand: "Printa", category: "printers", price, stock: 20, min: 2, status: "active", publication: "published", channels: ["storefront"] },
      });
      assert.equal(r.status, 201);
    }
  });

  it("names the exact field when a product is not valid", async () => {
    const bad = await call("POST", "/api/admin/products", {
      token: adminToken,
      body: { name: "X", sku: "my sku!", brand: "", category: "printers", price: null, stock: 1.5, min: 2 },
    });
    assert.equal(bad.status, 400);
    assert.deepEqual(Object.keys(bad.body.fields).sort(), ["brand", "name", "price", "sku", "stock"]);
    assert.match(bad.body.fields.sku, /no spaces/);

    const dupe = await call("POST", "/api/admin/products", {
      token: adminToken,
      body: { name: "Another", sku: "pp-pr-0300", brand: "Printa", category: "printers", price: 10, stock: 1, min: 1 },
    });
    assert.equal(dupe.status, 409);
    assert.ok(dupe.body.fields.sku);
  });

  it("gives two products with the same title different links, and no longer keeps a handle input, variants or SEO", async () => {
    const make = (sku: string) =>
      call("POST", "/api/admin/products", {
        token: adminToken,
        body: { name: "Twin Printer", sku, brand: "Printa", category: "printers", price: 100, stock: 3, min: 1, backorder: "block", variants: [{ key: "a" }], seoTitle: "x", excerpt: "y" },
      });
    const one = await make("TWIN-1");
    const two = await make("TWIN-2");
    assert.equal(one.status, 201);
    assert.equal(two.status, 201);
    const d1 = await call("GET", `/api/admin/products/${one.body.id}`, { token: adminToken });
    const d2 = await call("GET", `/api/admin/products/${two.body.id}`, { token: adminToken });
    assert.equal(d1.body.slug, "twin-printer");
    assert.equal(d2.body.slug, "twin-printer-2");
    for (const gone of ["ean", "backorder", "axes", "variants", "seoTitle", "seoDescription", "excerpt"]) assert.ok(!(gone in d1.body), gone);
  });

  it("keeps a product's pictures and drops anything that is not an image", async () => {
    const tiny = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=";
    const r = await call("POST", "/api/admin/products", {
      token: adminToken,
      body: {
        name: "Picture Printer", sku: "PIC-1", brand: "Printa", category: "printers", price: 100, stock: 3, min: 1,
        media: [
          { name: "ok.jpg", size: 123, url: tiny },
          { name: "script.jpg", size: 5, url: "data:text/html;base64,PHNjcmlwdD4=" },
          { name: "remote.jpg", size: 5, url: "https://evil.example/x.jpg" },
        ],
      },
    });
    assert.equal(r.status, 201);
    const d = await call("GET", `/api/admin/products/${r.body.id}`, { token: adminToken });
    assert.equal(d.body.media.length, 3);
    assert.equal(d.body.media[0].url, tiny);
    assert.equal(d.body.media[1].url, "");
    assert.equal(d.body.media[2].url, "");

    // The list rows point at the cover photo; it is served as an image to a signed-in admin only.
    const row = (await call("GET", "/api/admin/products?q=PIC-1&perPage=50", { token: adminToken })).body.rows[0];
    assert.match(row.cover, /^\/api\/admin\/products\/p-\d+\/cover\?v=[0-9a-f]{8}$/);
    const img = await fetch(base + row.cover, { headers: { authorization: `Bearer ${adminToken}` } });
    assert.equal(img.status, 200);
    assert.equal(img.headers.get("content-type"), "image/jpeg");
    assert.equal((await fetch(base + row.cover)).status, 401);
    const bare = (await call("GET", "/api/admin/products?q=TWIN-1&perPage=50", { token: adminToken })).body.rows[0];
    assert.equal(bare.cover, undefined);
  });

  it("lists the products an admin registered", async () => {
    const r = await call("GET", "/api/catalog");
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 2);
  });

  it("changes a product's price and name in admin and sees it on the storefront", async () => {
    const list = await call("GET", "/api/admin/products?q=PP-PR-0300&perPage=50", { token: adminToken });
    const flagship = list.body.rows.find((p: { sku: string }) => p.sku === "PP-PR-0300");
    assert.ok(flagship, "flagship product exists in admin with the storefront SKU");

    const patch = await call("PATCH", `/api/admin/products/${flagship.id}`, { token: adminToken, body: { price: 3999, name: "Printa Home 300 (edited)" } });
    assert.equal(patch.status, 200);

    const detail = await call("GET", "/api/products/printa-home-300");
    assert.equal(detail.body.product.price, 3999);
    assert.equal(detail.body.product.name, "Printa Home 300 (edited)");
  });

  it("hides a product from the storefront when it goes on hold", async () => {
    const list = await call("GET", "/api/admin/products?q=PP-PR-0120&perPage=50", { token: adminToken });
    const p = list.body.rows.find((x: { sku: string }) => x.sku === "PP-PR-0120");
    await call("PATCH", `/api/admin/products/${p.id}`, { token: adminToken, body: { status: "hold" } });
    assert.equal((await call("GET", "/api/products/printa-mini")).status, 404);
    assert.ok(!(await call("GET", "/api/catalog")).body.some((x: { id: string }) => x.id === "printa-mini"));
    await call("PATCH", `/api/admin/products/${p.id}`, { token: adminToken, body: { status: "active" } });
    assert.equal((await call("GET", "/api/products/printa-mini")).status, 200);
  });

  it("shows a copier published from the editor on the storefront, and hides it as a draft", async () => {
    const tiny = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=";
    // What the add-product form sends when it saves a product.
    const form = (publication: string) => ({
      name: "Office Copier X1", sku: "COP-X1", brand: "Kopira", category: "copiers", price: 25000, stock: 4, min: 1,
      status: "active", slug: "", description: "", media: [{ name: "front.jpg", size: 100, url: tiny }], compareAt: null, cost: null, taxExempt: false, specs: [],
      massKg: null, dims: { l: null, w: null, h: null }, hsCode: "", packaging: "pallet", publication,
      channels: ["storefront"], subType: "", collections: [], tags: [], bundled: [],
    });
    const made = await call("POST", "/api/admin/products", { token: adminToken, body: form("published") });
    assert.equal(made.status, 201);
    const shown = (await call("GET", "/api/catalog")).body.find((x: { sku: string }) => x.sku === "COP-X1");
    assert.ok(shown, "published copier is in the storefront catalog");
    assert.equal(shown.category, "copiers");
    const detail = await call("GET", `/api/products/${shown.id}`);
    assert.equal(detail.status, 200);

    // The admin photo is the card image and the gallery, served as a real cacheable image.
    assert.match(shown.image, /^\/api\/media\/p-\d+\/0\?v=[0-9a-f]{8}$/);
    assert.equal(detail.body.detail.gallery[0].src, shown.image);
    const img = await fetch(base + shown.image);
    assert.equal(img.status, 200);
    assert.equal(img.headers.get("content-type"), "image/jpeg");
    assert.match(img.headers.get("cache-control") ?? "", /immutable/);
    assert.ok((await img.arrayBuffer()).byteLength > 50);

    await call("PATCH", `/api/admin/products/${made.body.id}`, { token: adminToken, body: { publication: "draft" } });
    assert.ok(!(await call("GET", "/api/catalog")).body.some((x: { sku: string }) => x.sku === "COP-X1"));
    // A product that is not on sale does not hand out its photo either.
    assert.equal((await fetch(base + shown.image)).status, 404);
  });
});

describe("orders", () => {
  let orderId = "";
  let pin = "";

  it("prices the order on the server and ignores client-sent prices", async () => {
    const r = await call("POST", "/api/orders", {
      body: orderInput({ items: [{ id: "printa-home-300", qty: 2, unitPrice: 1 }], total: 1 }),
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.items[0].unitPrice, 3999);
    assert.equal(r.body.amounts.subtotal, 7998);
    assert.equal(r.body.amounts.shipping, 349); // express
    assert.equal(r.body.amounts.total, Math.round((7998 + 7998 * 0.085 + 349) * 100) / 100);
    orderId = r.body.id;
    pin = r.body.pin;
  });

  it("only shows the order to its PIN holder", async () => {
    assert.equal((await call("GET", `/api/orders/${orderId}`)).status, 404);
    assert.equal((await call("GET", `/api/orders/${orderId}?pin=0000-0000`)).status, 404);
    const ok = await call("GET", `/api/orders/${orderId}?pin=${pin}`);
    assert.equal(ok.status, 200);
    assert.ok(!("userId" in ok.body));
  });

  it("shows a signed-in customer only their own orders", async () => {
    const mine = await call("POST", "/api/orders", { token: customerToken, body: orderInput() });
    assert.equal(mine.status, 201);
    const list = await call("GET", "/api/account/orders", { token: customerToken });
    assert.deepEqual(list.body.map((o: { id: string }) => o.id), [`#${mine.body.id}`]);
    const other = await call("POST", "/api/auth/register", {
      body: { name: "Other", email: "other@example.com", password: "Str0ng!Passw0rd-x" },
    });
    assert.equal((await call("GET", `/api/orders/${mine.body.id}`, { token: other.body.token })).status, 404);
    assert.equal((await call("GET", `/api/orders/${mine.body.id}`, { token: customerToken })).status, 200);
  });

  it("rejects unknown products, bad options and bad input", async () => {
    assert.equal((await call("POST", "/api/orders", { body: orderInput({ items: [{ id: "nope", qty: 1 }] }) })).status, 400);
    assert.equal((await call("POST", "/api/orders", { body: orderInput({ items: [{ id: "printa-home-300", qty: 1, option: "zzz" }] }) })).status, 400);
    assert.equal((await call("POST", "/api/orders", { body: orderInput({ items: [{ id: "printa-home-300", qty: 0 }] }) })).status, 400);
    assert.equal((await call("POST", "/api/orders", { body: { items: [] } })).status, 400);
  });

  it("refuses more than is in stock, and takes stock when it sells", async () => {
    assert.equal((await call("POST", "/api/orders", { body: orderInput({ items: [{ id: "printa-home-300", qty: 99 }] }) })).status, 409);
    const before = await call("GET", "/api/admin/products?q=PP-PR-0300&perPage=50", { token: adminToken });
    const stock0 = before.body.rows.find((p: { sku: string }) => p.sku === "PP-PR-0300").stock;
    await call("POST", "/api/orders", { body: orderInput() });
    const after = await call("GET", "/api/admin/products?q=PP-PR-0300&perPage=50", { token: adminToken });
    assert.equal(after.body.rows.find((p: { sku: string }) => p.sku === "PP-PR-0300").stock, stock0 - 1);
  });

  it("appears in the admin orders with its real lines and totals", async () => {
    const detail = await call("GET", `/api/admin/orders/${orderId}`, { token: adminToken });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.lines[0].title, "Printa Home 300 (edited)");
    assert.equal(detail.body.lines[0].quantity, 2);
    assert.equal(detail.body.pricing.total, 9026.83);
    assert.equal(detail.body.customer.email, "buyer@example.com");
    const list = await call("GET", "/api/admin/orders?q=Test%20Buyer", { token: adminToken });
    assert.ok(list.body.rows.some((r: { id: string }) => r.id === `#${orderId}`));
  });

  it("applies a coupon an admin created, counts its use, and stops at its limit", async () => {
    const made = await call("POST", "/api/admin/coupons", {
      token: adminToken,
      body: { code: "TEST-TEN", campaign: "Test ten percent", type: "percentage", value: 10, limit: 1, status: "active" },
    });
    assert.equal(made.status, 201);
    const quote = await call("POST", "/api/cart/quote", { body: { items: [{ id: "printa-home-300", qty: 1 }], voucher: "test-ten" } });
    assert.equal(quote.body.amounts.voucher, 399.9);

    const placed = await call("POST", "/api/orders", { body: orderInput({ voucher: "TEST-TEN", delivery: "pickup" }) });
    assert.equal(placed.body.amounts.voucher, 399.9);

    // the single allowed use is spent: the same code is now worth nothing
    const again = await call("POST", "/api/orders", { body: orderInput({ voucher: "TEST-TEN", delivery: "pickup" }) });
    assert.equal(again.body.amounts.voucher, 0);
    const row = (await call("GET", "/api/admin/coupons?q=TEST-TEN", { token: adminToken })).body.rows[0];
    assert.equal(row.used, 1);
    assert.equal(row.state, "depleted");
  });

  it("ignores a voucher code nobody created", async () => {
    const r = await call("POST", "/api/orders", { body: orderInput({ voucher: "WELCOME5", delivery: "pickup" }) });
    assert.equal(r.status, 201);
    assert.equal(r.body.amounts.voucher, 0);
  });
});

describe("reports", () => {
  it("works out the dashboard and analytics from the real orders", async () => {
    const dash = await call("GET", "/api/admin/dashboard", { token: adminToken });
    assert.equal(dash.status, 200);
    assert.ok(dash.body.kpis.products.value >= 2);
    assert.ok(dash.body.kpis.orders.value >= 1);
    assert.ok(dash.body.orders.rows.length >= 1);
    assert.ok(dash.body.lowStock.every((x: { remaining: number; threshold: number }) => x.remaining <= x.threshold));

    const series = await call("GET", "/api/admin/revenue?range=month", { token: adminToken });
    assert.equal(series.status, 200);
    assert.equal(series.body.points.length, 30);

    const an = await call("GET", "/api/admin/analytics?range=30d", { token: adminToken });
    assert.equal(an.status, 200);
    assert.ok(an.body.kpis.orders >= 1);
    assert.ok(Number.isFinite(an.body.kpis.aov));

    const top = await call("GET", "/api/admin/analytics/top-products?range=30d", { token: adminToken });
    assert.equal(top.status, 200);
    assert.ok(top.body.total >= 2);
  });
});

describe("live categories reach products, coupons, reports and the storefront", () => {
  const category = (name: string, slug: string, extra: Record<string, unknown> = {}) =>
    call("POST", "/api/admin/categories", { token: adminToken, body: { name, slug, visibility: "active", ...extra } });
  const product = (sku: string, categoryKey: string, extra: Record<string, unknown> = {}) =>
    call("POST", "/api/admin/products", {
      token: adminToken,
      body: { name: `Item ${sku}`, sku, brand: "Acme", category: categoryKey, price: 50, stock: 2, min: 1, status: "active", publication: "published", channels: ["storefront"], ...extra },
    });
  const coupon = (code: string, categories: string[]) =>
    call("POST", "/api/admin/coupons", { token: adminToken, body: { code, campaign: code, type: "percentage", value: 10, limit: 5, status: "active", categories } });

  it("rejects a product whose category does not exist and saves one in a new category", async () => {
    const bad = await product("LIVE-BAD", "nope");
    assert.equal(bad.status, 400);
    assert.equal(bad.body.fields.category, "Choose a category.");

    assert.equal((await category("Gadgets", "/gadgets")).body.key, "gadgets");
    const ok = await product("GADGET-1", "gadgets");
    assert.equal(ok.status, 201);
    assert.equal(ok.body.category, "gadgets");
    assert.equal(ok.body.icon, "lucide:package");
    const listed = await call("GET", "/api/admin/products?category=gadgets&perPage=50", { token: adminToken });
    assert.deepEqual(listed.body.rows.map((r: { sku: string }) => r.sku), ["GADGET-1"]);
  });

  it("lets coupons use existing categories only, and blocks deleting a category a coupon uses", async () => {
    assert.equal((await coupon("LIVE-NOPE", ["nope"])).status, 400);
    const only = await category("Coupon only", "/coupon-only");
    assert.equal((await coupon("LIVE-OK", [only.body.key])).status, 201);
    const blocked = await call("DELETE", `/api/admin/categories/${only.body.id}`, { token: adminToken });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.message, "1 coupons use this category. Remove it from them first.");
  });

  it("lists products whose category key no longer exists without failing", async () => {
    const { allProducts } = await import("../src/data/admin-products");
    const store = allProducts();
    store.push({ id: "p-gone", sku: "GONE-1", name: "Orphan", tag: "", spec: "", serial: "", category: "gone", brand: "Acme", price: 1, stock: 1, min: 1, unit: "unit", status: "active", icon: "lucide:package" } as never);
    try {
      for (const path of ["/api/admin/products?perPage=50", "/api/admin/inventory?perPage=50", "/api/admin/analytics", "/api/admin/analytics/top-products?perPage=25", "/api/admin/dashboard"]) {
        assert.equal((await call("GET", path, { token: adminToken })).status, 200, path);
      }
    } finally {
      store.splice(store.findIndex((p) => p.id === "p-gone"), 1);
    }
  });

  it("shows every live category in analytics and filters best sellers by one", async () => {
    const a = await call("GET", "/api/admin/analytics?range=30d", { token: adminToken });
    const keys = a.body.categories.map((c: { category: string }) => c.category);
    assert.ok(keys.includes("gadgets") && keys.includes("printers"));
    const top = await call("GET", "/api/admin/analytics/top-products?category=gadgets", { token: adminToken });
    assert.deepEqual(top.body.rows.map((r: { sku: string }) => r.sku), ["GADGET-1"]);
  });

  it("serves visible categories to the storefront with product counts, kinds and no specs for general ones", async () => {
    const all = (await call("GET", "/api/categories")).body as { key: string; kind: string; count: number; name: string; abstract: string }[];
    assert.equal(all.find((c) => c.key === "printers")?.kind, "printer");
    // the built-ins come with a description for the shop's category cards
    for (const key of ["printers", "copiers", "inks-toner"]) assert.ok(all.find((c) => c.key === key)!.abstract.length > 20, key);
    const gadgets = all.find((c) => c.key === "gadgets")!;
    assert.equal(gadgets.kind, "general");
    assert.equal(gadgets.count, 1);
    await category("Empty Shelf", "/empty-shelf");
    assert.equal(((await call("GET", "/api/categories")).body as typeof all).find((c) => c.key === "empty-shelf")?.count, 0);

    const entry = (await call("GET", "/api/catalog")).body.find((p: { sku: string }) => p.sku === "GADGET-1");
    assert.equal(entry.category, "gadgets");
    assert.equal(entry.group, "general");
    assert.equal(entry.attrs, undefined);
    const detail = await call("GET", `/api/products/${entry.id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.detail.specGroups[0].title, "Key specifications");
  });

  it("hides a category from the storefront without taking its products off sale", async () => {
    const cats = (await call("GET", "/api/admin/categories", { token: adminToken })).body.nodes as { id: string; key: string; name: string; slug: string }[];
    const g = cats.find((c) => c.key === "gadgets")!;
    const patch = (visibility: string) =>
      call("PATCH", `/api/admin/categories/${g.id}`, { token: adminToken, body: { name: g.name, slug: g.slug, visibility } });
    assert.equal((await patch("hidden")).status, 200);
    assert.ok(!(await call("GET", "/api/categories")).body.some((c: { key: string }) => c.key === "gadgets"));
    const entry = (await call("GET", "/api/catalog")).body.find((p: { sku: string }) => p.sku === "GADGET-1");
    assert.ok(entry, "the product is still on sale");
    assert.equal((await call("GET", `/api/products/${entry.id}`)).status, 200);
    assert.equal((await patch("active")).status, 200);
  });
});

describe("hardening", () => {
  it("answers unknown routes and bad JSON cleanly", async () => {
    assert.equal((await call("GET", "/api/nope")).status, 404);
    const res = await fetch(base + "/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: "{bad" });
    assert.equal(res.status, 400);
  });

  it("never returns password hashes", async () => {
    const me = await call("GET", "/api/auth/me", { token: customerToken });
    assert.ok(!JSON.stringify(me.body).includes("hash"));
  });

  it("does not reveal whether an email is registered when asking for a reset", async () => {
    const a = await call("POST", "/api/auth/forgot-password", { body: { email: "cora@example.com" } });
    const b = await call("POST", "/api/auth/forgot-password", { body: { email: "ghost@example.com" } });
    assert.equal(a.status, b.status);
    assert.deepEqual(Object.keys(a.body).sort(), Object.keys(b.body).sort());
  });

  it("has stored its data in the database", async () => {
    const { get } = await import("../src/db");
    const count = async (c: string) =>
      (await get<{ n: number }>("SELECT COUNT(*) AS n FROM docs WHERE collection = ? AND deleted = 0", [c]))!.n;
    assert.ok((await count("products")) >= 2);
    assert.ok((await count("storefront-orders")) >= 3);
  });
});
