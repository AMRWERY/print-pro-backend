import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { closeDb, get, openDb, run } from "./index";

/**
 * `npm run admin:password`: sets the password of the admin account in the database (creating the account if there is none).
 * Set DB_URL / DB_AUTH_TOKEN to point at a hosted database, SEED_ADMIN_EMAIL to the admin's email,
 * and NEW_ADMIN_PASSWORD to the password you want. The password is never printed.
 */
const email = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.NEW_ADMIN_PASSWORD ?? "";

const problems = [
  !email && "Set SEED_ADMIN_EMAIL to the admin's email.",
  password.length < 12 && "NEW_ADMIN_PASSWORD needs at least 12 characters.",
  !(/[a-z]/.test(password) && /[A-Z]/.test(password)) && "NEW_ADMIN_PASSWORD needs upper and lower case letters.",
  !/\d/.test(password) && "NEW_ADMIN_PASSWORD needs a number.",
  !/[^A-Za-z0-9]/.test(password) && "NEW_ADMIN_PASSWORD needs a symbol.",
  password === "Studio#2026Pass" && "That is the public demo password. Choose a private one.",
].filter(Boolean);

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

await openDb();
const hash = await bcrypt.hash(password, 10);
const existing = await get<{ id: string; role: string }>("SELECT id, role FROM users WHERE email = ?", [email]);

if (existing) {
  await run("UPDATE users SET hash = ?, role = 'admin' WHERE id = ?", [hash, existing.id]);
  await run("DELETE FROM reset_tokens WHERE user_id = ?", [existing.id]);
  console.info(`Password updated for the admin account ${email}.`);
} else {
  await run(
    "INSERT INTO users (id, email, role, name, studio, tier, newsletter, hash, created_at) VALUES (?, ?, 'admin', 'Admin', 'PrintPro', 'business', 0, ?, ?)",
    [randomUUID(), email, hash, new Date().toISOString()],
  );
  console.info(`Created the admin account ${email}.`);
}
closeDb();
