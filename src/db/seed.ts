import { syncAll } from "./persist";

/**
 * Domain modules seed themselves the first time their collection is loaded (see persistentList);
 * this writes that first state to SQLite. Importing the routers is what loads the modules.
 */
export const seedIfEmpty = async () => {
  await import("../routes/admin");
  await import("../routes/storefront");
  const written = syncAll();
  if (written) console.info(`[seed] stored ${written} initial records`);
};

if (process.argv[1]?.endsWith("seed.ts") && process.argv.includes("--reset")) {
  const { rmSync } = await import("node:fs");
  const { config } = await import("../config");
  for (const f of ["", "-wal", "-shm"]) rmSync(config.dbPath + f, { force: true });
  console.info("[seed] database removed; start the server to seed again");
}
