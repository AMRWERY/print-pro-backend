import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../config";
import { get, run } from "../db";
import { handler, httpError } from "../lib/http";
import { requireAuth, signToken, type Role } from "../middleware/auth";

const MAX_FAILURES = 5;
const LOCK_MS = 30_000;
const TOKEN_TTL_MS = 15 * 60_000;
// A real bcrypt hash of a throwaway value, compared against when the email is unknown,
// so response timing doesn't reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

interface UserRow {
  id: string;
  email: string;
  role: Role;
  name: string;
  studio: string;
  tier: string;
  title: string | null;
  phone: string | null;
  newsletter: number;
  hash: string;
  created_at: string;
}

const publicUser = (u: UserRow) => ({
  id: u.id,
  email: u.email,
  role: u.role,
  name: u.name,
  studio: u.studio,
  tier: u.tier,
  title: u.title ?? undefined,
  phone: u.phone ?? undefined,
  newsletter: !!u.newsletter,
  createdAt: u.created_at,
});

/** A SQL statement as an object with async get/run, so call sites read the same as before. */
const stmt = (sql: string) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: (...args: unknown[]): Promise<any> => get(sql, args),
  run: (...args: unknown[]) => run(sql, args),
});

const q = {
  byEmail: stmt("SELECT * FROM users WHERE email = ?"),
  byId: stmt("SELECT * FROM users WHERE id = ?"),
  insert: stmt(
    "INSERT INTO users (id, email, role, name, studio, tier, newsletter, hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ),
  update: stmt("UPDATE users SET name = ?, studio = ?, title = ?, phone = ?, newsletter = ? WHERE id = ?"),
  setHash: stmt("UPDATE users SET hash = ? WHERE id = ?"),
  insertToken: stmt("INSERT INTO reset_tokens (token_hash, user_id, expires) VALUES (?, ?, ?)"),
  token: stmt("SELECT user_id, expires FROM reset_tokens WHERE token_hash = ?"),
  dropToken: stmt("DELETE FROM reset_tokens WHERE token_hash = ?"),
  dropExpired: stmt("DELETE FROM reset_tokens WHERE expires <= ?"),
  dropUserTokens: stmt("DELETE FROM reset_tokens WHERE user_id = ?"),
};

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

// The same rules the sign-up form shows.
const password = z
  .string()
  .min(12, "At least 12 characters")
  .max(128)
  .regex(/[a-z]/, "Needs a lower case letter")
  .regex(/[A-Z]/, "Needs an upper case letter")
  .regex(/\d/, "Needs a number")
  .regex(/[^A-Za-z0-9]/, "Needs a symbol");
const email = z.string().trim().toLowerCase().email().max(254);

const registerBody = z.object({
  name: z.string().trim().min(1).max(120),
  studio: z.string().trim().max(120).default(""),
  email,
  tier: z.enum(["business", "reseller", "home"]).default("home"),
  newsletter: z.boolean().default(false),
  password,
});

const parse = <T>(schema: z.ZodType<T>, body: unknown): T => {
  const r = schema.safeParse(body);
  if (!r.success) throw httpError(400, r.error.issues[0]?.message ?? "Invalid request");
  return r.data;
};

// Wrong-password lockout per account, in memory (resets on restart); the IP limiter below backs it up.
const failures = new Map<string, { count: number; until: number }>();

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: config.production ? 50 : 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { statusCode: 429, message: "Too many attempts. Try again later." },
});

export const authRouter = Router();
authRouter.use(authLimiter);

authRouter.post(
  "/register",
  handler(async (req, res) => {
    const input = parse(registerBody, req.body);
    if (await q.byEmail.get(input.email)) throw httpError(409, "An account with this email already exists");
    const id = randomUUID();
    await q.insert.run(
      id,
      input.email,
      "customer",
      input.name,
      input.studio,
      input.tier,
      input.newsletter ? 1 : 0,
      await bcrypt.hash(input.password, 10),
      new Date().toISOString(),
    );
    const row = await q.byId.get(id) as unknown as UserRow;
    res.status(201);
    return { token: signToken({ id, email: row.email, role: row.role }), user: publicUser(row) };
  }),
);

authRouter.post(
  "/login",
  handler(async (req) => {
    const body = parse(
      z.object({
        email,
        password: z.string().min(1).max(128),
        requireRole: z.enum(["admin", "customer"]).optional(),
      }),
      req.body,
    );
    const f = failures.get(body.email);
    if (f && f.until > Date.now()) {
      throw httpError(429, `Too many failed attempts. Try again in ${Math.ceil((f.until - Date.now()) / 1000)}s`);
    }
    const row = await q.byEmail.get(body.email) as UserRow | undefined;
    const ok = await bcrypt.compare(body.password, row?.hash ?? DUMMY_HASH);
    // The admin app asks for role=admin; a customer account gets the same answer as a wrong password.
    if (!row || !ok || (body.requireRole && row.role !== body.requireRole)) {
      const count = (f?.count ?? 0) + 1;
      failures.set(body.email, count >= MAX_FAILURES ? { count: 0, until: Date.now() + LOCK_MS } : { count, until: 0 });
      throw httpError(401, "Invalid email or password");
    }
    failures.delete(body.email);
    return { token: signToken({ id: row.id, email: row.email, role: row.role }), user: publicUser(row) };
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  handler(async (req) => {
    const row = await q.byId.get(req.user!.id) as UserRow | undefined;
    if (!row) throw httpError(401, "Sign in required");
    return { user: publicUser(row) };
  }),
);

authRouter.patch(
  "/profile",
  requireAuth,
  handler(async (req) => {
    const patch = parse(
      z.object({
        name: z.string().trim().min(1).max(120).optional(),
        studio: z.string().trim().max(120).optional(),
        title: z.string().trim().max(120).optional(),
        phone: z.string().trim().max(40).optional(),
        newsletter: z.boolean().optional(),
      }),
      req.body,
    );
    const cur = await q.byId.get(req.user!.id) as unknown as UserRow;
    await q.update.run(
      patch.name ?? cur.name,
      patch.studio ?? cur.studio,
      patch.title ?? cur.title,
      patch.phone ?? cur.phone,
      (patch.newsletter ?? !!cur.newsletter) ? 1 : 0,
      cur.id,
    );
    return { user: publicUser(await q.byId.get(cur.id) as unknown as UserRow) };
  }),
);

authRouter.post(
  "/change-password",
  requireAuth,
  handler(async (req) => {
    const body = parse(z.object({ current: z.string().min(1).max(128), next: password }), req.body);
    const row = await q.byId.get(req.user!.id) as unknown as UserRow;
    if (!(await bcrypt.compare(body.current, row.hash))) throw httpError(400, "Current password is wrong");
    await q.setHash.run(await bcrypt.hash(body.next, 10), row.id);
    await q.dropUserTokens.run(row.id);
    return { ok: true };
  }),
);

/** Always answers the same, so the form can't be used to find out which emails are registered. */
authRouter.post(
  "/forgot-password",
  handler(async (req) => {
    const body = parse(z.object({ email }), req.body);
    const row = await q.byEmail.get(body.email) as UserRow | undefined;
    const expires = Date.now() + TOKEN_TTL_MS;
    const token = randomBytes(32).toString("base64url");
    await q.dropExpired.run(Date.now());
    if (row) {
      await q.insertToken.run(sha(token), row.id, expires);
      // No mail service yet: the token goes to the log. Hook your mailer in here.
      console.info(`[auth] password reset for ${row.email}: ${token}`);
    }
    // Development only, so the reset page works without email.
    return { ok: true, expires, ...(config.production ? {} : { devToken: token }) };
  }),
);

authRouter.get(
  "/reset-token/:token",
  handler(async (req) => {
    const t = await q.token.get(sha(String(req.params.token))) as { expires: number } | undefined;
    return t && t.expires > Date.now() ? { valid: true, expires: t.expires } : { valid: false };
  }),
);

authRouter.post(
  "/reset-password",
  handler(async (req) => {
    const body = parse(z.object({ token: z.string().min(10).max(200), password }), req.body);
    const t = await q.token.get(sha(body.token)) as { user_id: string; expires: number } | undefined;
    if (!t || t.expires <= Date.now()) throw httpError(400, "This reset link is invalid or has expired");
    await q.setHash.run(await bcrypt.hash(body.password, 10), t.user_id);
    await q.dropToken.run(sha(body.token));
    return { ok: true };
  }),
);

/** Creates the first admin from env when none exists. */
export const ensureAdmin = async (adminEmail: string, adminPassword: string) => {
  if (await get("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1")) return;
  await q.insert.run(
    randomUUID(),
    adminEmail.trim().toLowerCase(),
    "admin",
    "Amr",
    "PrintPro",
    "business",
    0,
    await bcrypt.hash(adminPassword, 10),
    new Date().toISOString(),
  );
  console.info(`[auth] created admin account ${adminEmail}`);
};
