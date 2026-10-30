import compression from "compression";
import cors from "cors";
import express, { Router, type RequestHandler } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { boot } from "./boot";
import { config } from "./config";
import { authenticate, requireRole } from "./middleware/auth";
import { errorHandler, notFound } from "./middleware/errors";
import { gate } from "./middleware/gate";
import { persistAfterWrite } from "./middleware/persist";
import { authRouter } from "./routes/auth";

/** The routers that need the loaded data, built once the boot step has finished. */
let routes: Promise<Router> | undefined;
const loadRoutes = () =>
  (routes ??= (async () => {
    await boot();
    const [{ adminRouter }, { storefrontRouter }] = await Promise.all([import("./routes/admin"), import("./routes/storefront")]);
    const r = Router();
    r.use("/api/auth", authRouter);
    r.use("/api/admin", requireRole("admin"), adminRouter);
    r.use("/api", storefrontRouter);
    return r;
  })());

const mountRoutes: RequestHandler = (req, res, next) => {
  loadRoutes().then((r) => r(req, res, next), next);
};

export const createApp = () => {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: false, maxAge: 600 }));
  app.use(compression());
  if (config.production || process.env.NODE_ENV !== "test") app.use(morgan(config.production ? "combined" : "dev"));
  app.use(express.json({ limit: "1mb" }));

  // Answers without touching the database, so a host's health check passes while the data is still loading.
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use(gate);
  app.use(authenticate);
  app.use(persistAfterWrite);
  app.use(mountRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
};
