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

  it("rejects a forged token", async () => {
    assert.equal((await call("GET", "/api/admin/products", { token: "not.a.token" })).status, 401);
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
    assert.equal(dash.body.kpis.products.value, 2);
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
    assert.equal(top.body.total, 2);
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
