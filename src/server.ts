import { createApp } from "./app";
import { config } from "./config";
import { ensureAdmin } from "./routes/auth";
import { seedIfEmpty } from "./db/seed";

await ensureAdmin(config.seedAdmin.email, config.seedAdmin.password);
await seedIfEmpty();

createApp().listen(config.port, () => {
  console.info(`PrintPro API listening on http://localhost:${config.port} (${config.production ? "production" : "development"})`);
});
