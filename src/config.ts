import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  JWT_SECRET: z.string().optional(),
  JWT_TTL: z.string().default("12h"),
  DB_PATH: z.string().default("./data/printpro.db"),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001"),
  SEED_ADMIN_EMAIL: z.string().email().default("amr@example.com"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("Studio#2026Pass"),
});

const env = schema.parse(process.env);
const production = env.NODE_ENV === "production";

if (production && (!env.JWT_SECRET || env.JWT_SECRET.length < 32)) {
  throw new Error("JWT_SECRET must be set to at least 32 characters in production");
}
if (production && env.SEED_ADMIN_PASSWORD === "Studio#2026Pass") {
  throw new Error("Set SEED_ADMIN_PASSWORD to a private value in production");
}

export const config = {
  production,
  port: env.PORT,
  // A fixed dev secret keeps tokens valid across `tsx watch` restarts; never used in production.
  jwtSecret: env.JWT_SECRET || "dev-only-secret-change-me-dev-only-secret",
  jwtTtl: env.JWT_TTL,
  dbPath: env.DB_PATH,
  corsOrigins: env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
  seedAdmin: { email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
};
