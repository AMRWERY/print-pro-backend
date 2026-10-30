import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { authenticate, requireRole } from "./middleware/auth";
import { errorHandler, notFound } from "./middleware/errors";
import { persistAfterWrite } from "./middleware/persist";
import { adminRouter } from "./routes/admin";
import { authRouter } from "./routes/auth";
import { storefrontRouter } from "./routes/storefront";

export const createApp = () => {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: false, maxAge: 600 }));
  app.use(compression());
  if (config.production || process.env.NODE_ENV !== "test") app.use(morgan(config.production ? "combined" : "dev"));
  app.use(express.json({ limit: "1mb" }));

  app.use(authenticate);
  app.use(persistAfterWrite);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/admin", requireRole("admin"), adminRouter);
  app.use("/api", storefrontRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
};
