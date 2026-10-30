# PrintPro API

One Node.js + Express 5 + TypeScript backend for both the storefront (`../user`) and the admin dashboard (`../admin`).
Data is stored in SQLite (Node's built-in `node:sqlite`, no native modules) and survives restarts.

## Run

```bash
cd api
npm install
cp .env.example .env     # first time; edit the secrets
npm run dev              # http://localhost:4000, auto-restarts on change
npm test                 # end-to-end tests over real HTTP
npm run typecheck
npm run seed             # deletes the database; the next start re-seeds it
```

Requires Node 24+. On first start it creates the admin account from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
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

Domain logic keeps its working state in memory (loaded from SQLite at boot) and every successful write request is
flushed to SQLite before the response is sent, only the records that changed. This is fast and simple, and it means
**one API process must own the database**. Moving to several instances needs those modules moved onto direct SQL.

## Known limits

- No payment gateway or email service is connected. Orders start unpaid; an admin moves them along. Password reset tokens are logged.
- `dashboard`, `analytics` and `revenue` serve the seeded demo numbers; they are not computed from live orders yet.
- Coupon per-account limits and tiers are stored but not enforced at checkout.
- Seed data uses fixed demo dates (admin "now" is 2026-10-31).
