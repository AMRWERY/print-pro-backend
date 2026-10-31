// Removes the old demo records (products, customers, coupons, categories, content, inventory history,
// generated demo orders) from the database the API uses, and resets their id counters.
//
//   npm run clear-demo-data             shows what would be removed
//   npm run clear-demo-data -- --yes    removes it
//
// Reads the same settings as the API: DB_URL + DB_AUTH_TOKEN for Turso, or DB_PATH for a local file.
// Records are marked deleted (not erased), so a running API instance picks the removal up on its next request.
// Orders placed through the shop or created in admin, accounts, and settings are left alone.
import "dotenv/config";
import { createClient } from "@libsql/client";

const apply = process.argv.includes("--yes");
const url = process.env.DB_URL || `file:${(process.env.DB_PATH || "./data/printpro.db").replaceAll("\\", "/")}`;
const db = createClient({ url, authToken: process.env.DB_AUTH_TOKEN || undefined });

const COLLECTIONS = [
  "products",
  "product-extras",
  "product-revisions",
  "inventory",
  "inventory-movements",
  "customers",
  "customers.notes",
  "coupons",
  "content",
  "categories",
  "orders", // the generated demo orders; real ones live in orders.created / orders.placed
];

// Counters go back to where a fresh install starts them.
const COUNTERS = {
  "products.seq": 0,
  "inventory.seq": 0,
  "inventory.clock": 0,
  "customers.seq": 0,
  "customers.clock": 0,
  "customers.noteSeq": 100,
  "coupons.seq": 0,
  "coupons.clock": 0,
  "content.seq": 0,
  "content.clock": 0,
  "categories.seq": 100,
};

const marks = COLLECTIONS.map(() => "?").join(",");
const counts = await db.execute({
  sql: `SELECT collection, COUNT(*) AS n FROM docs WHERE deleted = 0 AND collection IN (${marks}) GROUP BY collection`,
  args: COLLECTIONS,
});
const host = url.startsWith("file:") ? url : url.replace(/^(\w+:\/\/)?([^/?]+).*$/, "$2");
console.log(`Database: ${host}`);
const rows = counts.rows.map((r) => `${r.collection}=${r.n}`);
console.log(rows.length ? `To remove: ${rows.join("  ")}` : "Nothing to remove: no demo records found.");

const keptRows = await db.execute({
  sql: `SELECT collection, COUNT(*) AS n FROM docs WHERE deleted = 0 AND collection NOT IN (${marks}) GROUP BY collection`,
  args: COLLECTIONS,
});
if (keptRows.rows.length) console.log(`Kept:      ${keptRows.rows.map((r) => `${r.collection}=${r.n}`).join("  ")}`);

if (!apply) {
  console.log(rows.length ? "\nDry run. Run again with --yes to remove them." : "");
  process.exit(0);
}

const statements = [
  "UPDATE meta SET n = n + 1 WHERE key = 'ver'",
  {
    sql: `UPDATE docs SET deleted = 1, ver = (SELECT n FROM meta WHERE key = 'ver') WHERE deleted = 0 AND collection IN (${marks})`,
    args: COLLECTIONS,
  },
  ...Object.entries(COUNTERS).map(([key, value]) => ({
    sql: "INSERT INTO kv (key, json, ver) VALUES (?, ?, (SELECT n FROM meta WHERE key = 'ver')) ON CONFLICT(key) DO UPDATE SET json = excluded.json, ver = excluded.ver",
    args: [key, JSON.stringify(value)],
  })),
];
await db.batch(statements, "write");

const left = await db.execute({
  sql: `SELECT COUNT(*) AS n FROM docs WHERE deleted = 0 AND collection IN (${marks})`,
  args: COLLECTIONS,
});
console.log(`\nDone. Demo records left: ${left.rows[0].n}`);
console.log("Restart the API (or let it handle one request) so it drops what it had loaded.");
