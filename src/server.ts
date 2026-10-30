import { createApp } from "./app";
import { boot } from "./boot";
import { config } from "./config";

// Fail fast if the database can't be reached, and have the data loaded before the first request.
await boot();

createApp().listen(config.port, () => {
  console.info(`PrintPro API listening on http://localhost:${config.port} (${config.production ? "production" : "development"})`);
});
