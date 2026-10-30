import { rmSync } from "node:fs";
import { boot } from "../boot";
import { config } from "../config";
import { closeDb } from "./index";

/**
 * `npm run seed`: opens the database and stores the demo data if it has never been stored. Run it once against a
 * new hosted database (set DB_URL and DB_AUTH_TOKEN) so the first request on the host doesn't have to do it.
 * `npm run seed -- --reset` first deletes a LOCAL database file.
 */
if (process.argv.includes("--reset")) {
  if (!config.dbUrl.startsWith("file:")) throw new Error("--reset only works on a local database file");
  const path = config.dbUrl.slice("file:".length);
  for (const f of ["", "-wal", "-shm"]) rmSync(path + f, { force: true });
  console.info(`[seed] removed ${path}`);
}

await boot();
console.info("[seed] database is ready");
closeDb();
