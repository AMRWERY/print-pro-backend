import { config } from "./config";
import { openDb } from "./db";
import { preload, syncAll } from "./db/persist";
import { ensureAdmin } from "./routes/auth";

let booting: Promise<void> | undefined;

/**
 * Opens the database, loads its contents, and loads the domain modules (which take their state from what was
 * just loaded, or seed themselves on the very first run). Runs once per process; every request waits for it.
 */
export const boot = (): Promise<void> => {
  booting ??= (async () => {
    await openDb();
    await preload();
    await ensureAdmin(config.seedAdmin.email, config.seedAdmin.password);
    // Importing the routers is what loads the domain modules, so this must come after preload().
    await import("./routes/admin");
    await import("./routes/storefront");
    const stored = await syncAll();
    if (stored) console.info(`[seed] stored ${stored} initial records`);
    const { allProducts } = await import("~/data/admin-products");
    const { allCustomers } = await import("~/data/admin-customers");
    const { allOrders } = await import("~/data/admin-orders");
    console.info(`[data] ${config.dbUrl}: ${allProducts().length} products, ${allCustomers().length} customers, ${allOrders().length} orders`);
  })().catch((e) => {
    booting = undefined; // let the next request try again
    throw e;
  });
  return booting;
};
