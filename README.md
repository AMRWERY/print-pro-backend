# PrintPro API

One Node.js + Express 5 + TypeScript backend for both the storefront (`../user`) and the admin dashboard (`../admin`).
Data is stored in a libSQL database: a local SQLite file in development, a hosted Turso database in production. It survives restarts and is shared by every running instance.

## Run

```bash
cd api
npm install
cp .env.example .env     # first time; edit the secrets
npm run dev              # http://localhost:4000, auto-restarts on change
npm test                 # end-to-end tests over real HTTP
npm run typecheck
npm run seed             # opens the database and stores the demo data if it was never stored
                         # (npm run seed -- --reset deletes a LOCAL database file first)
npm run build:vercel     # bundles the API into .vercel/output for Vercel
```

Requires Node 20+ (24 recommended). On first start it creates the admin account from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
(quote the password in `.env` if it contains `#`) and seeds the demo catalog, orders, customers and so on.

Production: set `NODE_ENV=production`, a `JWT_SECRET` of 32+ characters, a private `SEED_ADMIN_PASSWORD`, and `CORS_ORIGINS`.
The server refuses to start without them. Run a single instance (see "How data is stored").

## Connecting the apps

Both Nuxt apps talk to this API **through their own `server/` folder**, never from the browser directly:

```
browser → Pinia store (app/stores/*) → Nuxt server route (server/api/**) → this API
```

- Each endpoint has an explicit handler in the app's `server/api/` (for example `admin/server/api/admin/products/[id].patch.ts`). Handlers call `forward(event, path)` from `server/utils/api.ts`.
- Sign-in goes through `server/api/auth/login.post.ts`, which stores the API token in an **httpOnly cookie** (`pp_session`). The browser JavaScript never sees the token; it only knows the signed-in `user`.
- Pages never call `$fetch` / `useFetch` themselves; Pinia stores do, through `api()` in `app/utils/api.ts`.
- The API address is `runtimeConfig.apiBase` (default `http://localhost:4000`), overridden with the `NUXT_API_BASE` environment variable. It is server-only.

Local development, three terminals:

```bash
cd api    && npm run dev                     # http://localhost:4000
cd user   && npm run dev                     # http://localhost:3000  (storefront)
cd admin  && npm run dev                     # http://localhost:3001  (admin)
```

Production: deploy the API on a private address and give each Nuxt app `NUXT_API_BASE=https://your-api-host`. The apps forward the visitor's IP in `X-Forwarded-For` so the API's rate limits are per visitor; the session cookie is `Secure` outside dev, so serve the apps over HTTPS.

## Auth

`Authorization: Bearer <token>` (this is what the Nuxt servers send; they take it from the cookie) (JWT, 12 h). Two roles:

- `customer`: created by `POST /api/auth/register`. Registration can never create an admin.
- `admin`: created from the env seed. Everything under `/api/admin/*` requires it (401 signed out, 403 customer).

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | `{name, studio?, email, tier?, newsletter?, password}` → `201 {token, user}`. Password: 12+ chars, upper, lower, digit, symbol |
| POST | `/api/auth/login` | `{email, password, requireRole?}` → `{token, user}`. The admin app sends `requireRole: "admin"`. 401 on any failure, 429 after 5 wrong tries (30 s) |
| GET | `/api/auth/me` | → `{user}` |
| PATCH | `/api/auth/profile` | `{name?, studio?, title?, phone?, newsletter?}` → `{user}` |
| POST | `/api/auth/change-password` | `{current, next}` |
| POST | `/api/auth/forgot-password` | `{email}` → always `{ok, expires}`; outside production also `devToken` (no mail service is connected, the token is logged) |
| GET | `/api/auth/reset-token/:token` | → `{valid, expires?}` |
| POST | `/api/auth/reset-password` | `{token, password}` |

`user` is `{id, email, role, name, studio, tier, title?, phone?, newsletter, createdAt}`. Errors are `{statusCode, message}`.

## Storefront (public unless noted)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/catalog` | Catalog products with live admin price, name, stock state and visibility |
| GET | `/api/products/:id` | `{product, detail, related}`; 404 if hidden in admin |
| POST | `/api/cart/quote` | `{items:[{id, qty, option?}], voucher, delivery?}` → `{valid, amounts}` |
| POST | `/api/orders` | `{items, voucher?, contact, address, delivery, payment:{id, last4?}, notes?}` → `201 Order`. **Prices are computed on the server**; any client price is ignored. Sign in (optional) to attach the order to the account. 409 if stock is short |
| GET | `/api/orders/:id?pin=` | The owner (signed in) or anyone with the order's PIN. Otherwise 404 |
| GET | `/api/account/orders` | Signed-in customer's orders as account-page rows |

## Admin (`/api/admin/*`, admin role)

Same paths, methods and response shapes the admin app already used:
`products`, `categories`, `orders`, `customers`, `coupons`, `inventory`, `content`, `settings`, `analytics`, `dashboard`, `revenue`.

## How admin and storefront connect

- **Products.** Every storefront product has an admin record with the same SKU (for example `PP-PR-0300`). Editing its price, name or brand in admin changes the storefront; setting its status to anything but `active`, or its publication to draft, hides it. A product created in the admin editor and published to the `storefront` channel appears in the catalog with category defaults for specs the storefront owns.
- **Orders.** A storefront order is added to the admin Orders list (with its real lines, totals and contact) and takes stock from the product.
- **Coupons.** An active coupon from the admin Coupons screen works at checkout and counts its use against its limit.

## How data is stored

Domain logic keeps its working state in memory, loaded from the database when an instance starts. Every successful write
request is flushed to the database as one versioned batch before the response is sent, and only the records that changed are
written. Each request first checks the database version; if another instance has written since, it pulls just those
records. So several instances (serverless functions) stay in step. Requests run one at a time per instance.

Two instances changing the **same record at the same instant** resolve as last write wins. Two instances **creating** a
counter-numbered record at the same instant: one write is rejected with a 500 "Could not save your change. Try again."
and the retry succeeds.

## Deploying on Vercel (free)

1. **Database.** Create a free Turso database (turso.tech) in the region closest to Vercel's default function region
   (Washington D.C.). Copy its URL (`libsql://...`) and create an auth token.
2. **Seed it once from your PC**, so the first request on Vercel doesn't have to:
   ```powershell
   cd api
   $env:DB_URL="libsql://YOUR-DB.turso.io"; $env:DB_AUTH_TOKEN="YOUR-TOKEN"
   $env:SEED_ADMIN_EMAIL="you@example.com"; $env:SEED_ADMIN_PASSWORD="your private password"
   npm run seed
   ```
3. **Vercel project.** Import the API repo. Framework preset **Other**; Root Directory is the folder holding
   `package.json` and `vercel.json`. The build command comes from `vercel.json` (`npm run build:vercel`).
4. **Environment variables** (Production): `JWT_SECRET` (32+ random characters), `SEED_ADMIN_EMAIL`,
   `SEED_ADMIN_PASSWORD` (same values as step 2), `DB_URL`, `DB_AUTH_TOKEN`, `TRUST_PROXY=1`.
5. Deploy, open `https://<project>.vercel.app/api/health` (expect `{"ok":true}`), then `/api/catalog`.
6. Point the admin and storefront apps at it: `NUXT_API_BASE=https://<project>.vercel.app`.

## Known limits

- On serverless hosts the sign-in lockout and rate limits live in each instance's memory, so they are weaker than on one server.
- The first request after a quiet period loads the data again (about 2 s plus database latency).

- No payment gateway or email service is connected. Orders start unpaid; an admin moves them along. Password reset tokens are logged.
- `dashboard`, `analytics` and `revenue` serve the seeded demo numbers; they are not computed from live orders yet.
- Coupon per-account limits and tiers are stored but not enforced at checkout.
- Seed data uses fixed demo dates (admin "now" is 2026-10-31).
