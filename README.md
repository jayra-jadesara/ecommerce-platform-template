# White-Label E-Commerce Platform Template

Reusable, production-oriented foundation for multi-client storefronts. Deploy a new client with a new repository, Supabase project, domain, brand, and catalog — without rewriting core architecture.

**Phase 1** delivers the application shell: config-driven theme, layout, design tokens, providers, and feature folder structure.

**Phase 2** adds the PostgreSQL / Supabase schema (migrations + RLS + storage buckets) and typed client utilities.

**Phase 3** adds Supabase Auth (customer + admin), RBAC, protected account/admin routes, and middleware session refresh.

**Phase 4** connects storefront theme, branding, animation, SEO, and navigation to Supabase (`store_theme_settings`, `store_branding`, etc.). The Admin Theme Editor UI is Phase 5.

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + Material UI (coexistence via CSS layers)
- TanStack React Query
- React Hook Form + Zod
- Framer Motion (safe animation presets)
- Three.js / React Three Fiber (lazy-loaded, isolated)

Prepared for later: Supabase (Auth, DB, Storage, Edge Functions), Razorpay.

## Getting started

### Prerequisites

- Node.js 20+ recommended
- npm 10+

### Setup

```bash
# Install dependencies
npm install

# Copy environment template (do not commit real secrets)
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm test` | Unit tests (permissions / auth helpers) |

## Environment variables

See `.env.example`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (auth redirects, SEO) |
| `ADMIN_ROUTE` | Admin URL segment (default `manage-store`) — **not a security boundary** |
| `STORE_SLUG` / `NEXT_PUBLIC_STORE_SLUG` | Active `stores.slug` for this deployment (optional if one active store) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged key (never expose to the browser) |
| `RAZORPAY_KEY_ID` | Razorpay key id (server; returned to Checkout.js only via server action) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret (server-only) |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC secret (server-only) |

Never commit `.env` or `.env.local`.

## Authentication (Phase 3)

### Customer flows

| Path | Purpose |
| --- | --- |
| `/login` | Customer sign-in |
| `/register` | Customer registration (creates Auth user; profile via DB trigger) |
| `/forgot-password` | Password reset email |
| `/reset-password` | Set new password after recovery link |
| `/account/*` | Protected account area (profile functional; addresses/orders/payments placeholders) |

Passwords are handled only by Supabase Auth — never stored in `user_profiles`.

### Admin flows

Set `ADMIN_ROUTE` (example `manage-store`). Admin URLs become:

- `/manage-store/login`
- `/manage-store/dashboard`
- `/manage-store/products` (placeholder, permission-gated)
- …

**Important:** a custom admin path is convenience only. Real protection is:

Supabase Auth session → `admin_users` (active) → `admin_user_roles` / `roles` → permission map → RLS.

A normal authenticated customer is **not** an admin.

### Create the first admin (manual)

There is no public “make me admin” flow.

1. Create a user in Supabase Auth (Dashboard → Authentication, or register via `/register`).
2. Copy the user’s UUID.
3. Ensure `roles` are seeded (`SUPER_ADMIN`, `ADMIN`, `EDITOR`, `ORDER_MANAGER`).
4. In the SQL editor (service role / dashboard):

```sql
insert into public.admin_users (user_id, store_id, is_active)
values ('<AUTH_USER_UUID>', null, true);

insert into public.admin_user_roles (user_id, role_id)
select '<AUTH_USER_UUID>', id from public.roles where code = 'SUPER_ADMIN';
```

5. Sign in at `/${ADMIN_ROUTE}/login`.

Only `SUPER_ADMIN` (or trusted server-side operations) should assign admin roles later. Never promote from the client.

### Role → permission map

Centralized in `src/features/auth/permissions.ts`.

- `SUPER_ADMIN` — all permissions  
- `ADMIN` — store operations (not `users.manage` / `audit.view`)  
- `EDITOR` — catalog/CMS/media subset  
- `ORDER_MANAGER` — orders/customers/payments view-update subset  

Server helpers: `getCurrentUser`, `getCurrentAdmin`, `requireUser`, `requireAdmin`, `requirePermission` in `src/features/auth/session.ts`.

### Middleware / proxy

`src/proxy.ts` (Next.js 16 proxy convention) refreshes the Supabase session and performs coarse redirects (unauthenticated `/account` and admin areas). Fine-grained RBAC still runs in server layouts/pages.

### Theme engine (Phase 4)

Storefront appearance loads from Supabase (cached ~60s, tag `storefront-config`):

- `store_theme_settings` → semantic colors + enabled modes
- `store_branding` → name, logos, favicon, tagline
- `store_animation_settings` → allow-listed motion presets
- `store_seo_settings` / `navigation_items` → metadata & nav

Flow: **Database → ThemeConfig → CSS variables + MUI theme** (one source of truth).

Fallbacks: if Supabase is unavailable or values fail validation, `src/config/defaults.ts` is used. Invalid colors cannot inject arbitrary CSS.

Admin Theme Editor UI is **not** included yet (Phase 5). Preview helper: `ThemePreview`.

After Admin edits later, call `revalidateTag('storefront-config')`.

### Admin Theme Editor (Phase 5)

Route: `/${ADMIN_ROUTE}/settings/theme` (example `/manage-store/settings/theme`)

- Permissions: `theme.view` (EDITOR+), `theme.update` (SUPER_ADMIN / ADMIN)
- Live preview via `ThemePreview` (unsaved form state)
- Saves to `store_theme_settings` + `store_animation_settings`, writes `THEME_UPDATED` audit log, revalidates `storefront-config`
- RLS: theme/animation writes restricted to SUPER_ADMIN and ADMIN

Apply migration: `supabase/migrations/20260907160000_theme_write_rls.sql`

1. **Site URL** = `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`)
2. **Redirect URLs** include `http://localhost:3000/auth/callback` (and production equivalent)
3. Enable email auth; enable confirmations if desired

## Supabase database (Phase 2)

Migrations live in `supabase/migrations/`. Seed data (`supabase/seed.sql`) inserts **system roles only** — no client branding or products.

### Apply to a fresh Supabase project

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. Link the project (use your project ref; do not commit access tokens):

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

3. Push migrations:

```bash
npx supabase db push
```

4. Optional seed (roles):

```bash
npx supabase db reset   # local only
# or run supabase/seed.sql in the SQL editor on a linked project
```

Alternatively, open the Supabase SQL Editor and run each migration file in chronological order.

**This repository does not automatically migrate a remote database.** Migrations must be applied manually with CLI credentials or the SQL editor.

### Storage buckets

| Bucket | Public | Purpose |
| --- | --- | --- |
| `branding` | yes | Logos, favicon, OG images |
| `products` | yes | Product imagery |
| `categories` | yes | Category imagery |
| `cms` | yes | CMS / page media |
| `media` | no | Private media library |

PostgreSQL stores paths/metadata only — never binary files.

### App clients

| Module | Use |
| --- | --- |
| `@/lib/supabase/client` | Browser (anon key) |
| `@/lib/supabase/server` | Server Components / Route Handlers (anon + cookies) |
| `@/lib/supabase/admin` | Server-only service role (explicit import) |

## Architecture overview

```
src/
  app/                 # Next.js routes, loading/error/not-found
  components/
    ui/                # Empty / loading / error states
    layout/            # AppLayout, Header, Footer, Container, PageShell
    common/            # Shared chrome (e.g. theme toggle)
    three/             # Lazy 3D canvas wrappers
  features/            # Feature modules (auth, products, cart, theme, …)
  config/              # Default platform config (brand, theme, nav, SEO)
  providers/           # React Query + MUI cache + theme
  services/            # Data-access stubs + storage bucket constants
  lib/supabase/        # Browser / server / admin clients
  types/               # PlatformConfig + Database contracts
  validations/         # Shared Zod schemas
  styles/              # Semantic design tokens

supabase/
  migrations/          # PostgreSQL schema, RLS, storage
  seed.sql             # System roles only
```

### White-label rules

- Brand name, colors, logos, and copy come from `PlatformConfig` (defaults today; Supabase later).
- Components consume semantic CSS variables (`--color-primary`, …), not hard-coded brand colors.
- No client-specific product or company content in reusable layers.

### Theme

- Modes: `light` | `dark` | `system` (default: light)
- User toggle can be disabled via `theme.allowUserToggle`
- Tokens apply to both Tailwind utilities and MUI palette

### Animations

Use allow-listed presets only (`fade`, `fade-up`, `fade-down`, `slide-up`, `slide-down`, `scale`, `none`). Do not execute arbitrary animation code from a database.

### Content builder (Phase 15)

Client-friendly homepage and page management under **Content** (not “CMS”):

| Area | Route / behavior |
| --- | --- |
| Homepage | `/${ADMIN_ROUTE}/content/homepage` — section list, add/edit/enable, move up/down, draft/publish |
| Pages | `/${ADMIN_ROUTE}/content/pages` — CRUD + SEO; live at `/pages/{slug}` when published |
| Banners | `/${ADMIN_ROUTE}/content/banners` — promotional banners with schedule |
| Images | `/${ADMIN_ROUTE}/media` — MediaPicker (`folder=cms`) |

Section types (allow-listed): hero, categories, products, banner, text_image, about, features, statistics, testimonials, faq, cta, newsletter, text, image. Unknown/`custom` configs are rejected and not rendered.

Publishing: `pages.status` = `draft` \| `published` \| `archived`. Storefront loads only **published** pages and **active** sections. Homepage slug is reserved as `home`.

Permissions: `content.view|create|update|delete|publish` (EDITOR includes publish; ORDER_MANAGER has none). Legacy `cms.*` remains for compatibility.

Cache tags: `storefront-homepage`, `storefront-pages`, `storefront-banners`, `storefront-page:{slug}` — revalidated on admin writes only.

Migration: `20260908160000_content_builder.sql` (section types, page image paths, `banners`, `newsletter_subscribers` + RLS).

```bash
npx supabase db push
```

Known limitations: static routes (`/about`, `/privacy`, …) still override CMS pages with the same slug; rich text is plain text (no HTML); newsletter stores emails only (no sending); product/category pickers use IDs in advanced fields for v1.

### Premium 3D storefront (Phase 16)

Optional Three.js / React Three Fiber experiences. **2D always works** without WebGL.

| Area | Behavior |
| --- | --- |
| Admin | Store Settings → Appearance → **3D & Visual Effects** |
| Config | `store_visual_effects_settings` (enabled, hero/product toggles, quality LOW/MEDIUM/HIGH, hero preset allow-list, mobile 3D, respect reduced motion) |
| Hero | Homepage hero section: optional decorative backdrop; presets `NONE` \| `FLOATING_SHAPES` \| `PRODUCT_ORBIT` \| `ABSTRACT_PARTICLES` \| `SOFT_GEOMETRY` |
| Product | Optional `products.model_path` — trusted path only: `products/{storeId}/3d/{file}.glb\|gltf` |
| Fallback | Disabled / no WebGL / reduced motion / mobile off → static 2D; `ThreeErrorBoundary` isolates failures |
| Theme | Scene colors from CSS vars (`--color-primary`, …) — no hard-coded brand colors |
| Loading | Dynamic import of R3F; not on ordinary pages |

Audit: `VISUAL_EFFECTS_UPDATED` when 3D settings change (not on preview).

Migration: `20260908170000_visual_effects_3d.sql` (table + RLS + `products.model_path` + products-bucket MIME for glTF).

```bash
npx supabase db push
```

Known limitations: no AI photo→3D; no GLB upload UI in Media Library yet (path paste / storage upload); no paid 3D SaaS; homepage preview lists the selected preset without mounting a live canvas.

### SEO + Google visibility (Phase 17)

Reuses `store_seo_settings` and `buildPageMetadata`. White-label absolute URLs come from validated `NEXT_PUBLIC_SITE_URL` (never request Host).

| Surface | Behavior |
| --- | --- |
| Store | Site title, description, OG, robots — **Store Settings → Google & SEO** |
| Homepage | Store SEO + Organization / WebSite JSON-LD (+ SearchAction → `/products?q=`) |
| Products | `/products/[slug]` metadata + Product / Offer / BreadcrumbList JSON-LD |
| Categories | `/categories/[slug]` + optional `seo_title` / `seo_description` |
| CMS pages | Published only; draft/archived not indexable |
| Sitemap | `/sitemap.xml` — homepage, products listing, active products/categories, published pages |
| Robots | `/robots.txt` — disallow account/cart/checkout/payment/auth + `ADMIN_ROUTE` |

Variant pricing: single `Offer` when one price; `AggregateOffer` when prices differ. Currency from store settings.

Audits: `SEO_UPDATED`, `PRODUCT_SEO_UPDATED`, `CATEGORY_SEO_UPDATED`, `PAGE_SEO_UPDATED` (on real saves).

Migration: `20260908180000_category_seo.sql`.

```bash
npx supabase db push
```

Deploy: set `NEXT_PUBLIC_SITE_URL=https://your-client-domain.com` per environment. Google indexing is not verified by this repo.

### Performance + PWA (Phase 18)

Storefront-focused load and mobile UX; optional lightweight PWA. No paid CDN/PWA/analytics services.

| Area | Behavior |
| --- | --- |
| Images | `next/image` on product cards/gallery; AVIF/WebP; optional Supabase transform via `NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM=true` |
| Catalog cache | `listStorefrontProducts` uses `unstable_cache` + existing catalog tags (60s) |
| 3D | Hero via `Hero3DSlot` + dynamic R3F; PDP loads `Product3DViewer` only when a trusted model + admin flags allow |
| PWA | Branding-driven `/manifest.webmanifest`; minimal `/sw.js`; `/offline` fallback |
| SW rules | Network-only for cart/checkout/account/payment/auth/API/`ADMIN_ROUTE`; cache-first `/_next/static`; navigations network-first → offline page |
| Mobile | Sticky cart/checkout/product CTAs; ≥44px tap targets on primary actions |
| Fonts | `next/font` with `adjustFontFallback` to limit CLS |

**Engineering budgets (targets, not claimed scores):** no Three.js on non-3D pages; no unbounded public catalog fetch; hero LCP text must not wait on WebGL; never cache private responses in the SW.

#### Local verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Optional SW in development: `NEXT_PUBLIC_ENABLE_SW_DEV=1`.

#### Lighthouse (manual — do not invent scores)

1. Deploy or run `npm run build && npm run start`.
2. Chrome DevTools → Lighthouse on Home, a product page, and Cart (mobile + desktop).
3. Record LCP, CLS, INP, TTFB, and total image weight; compare before/after deploys.
4. Confirm Application → Manifest installs; Service Workers → `/sw.js` active; Cache Storage has only `storefront-static-*` / `storefront-offline-*`.
5. DevTools → Network → Offline: public navigations should show `/offline`; cart/checkout must still require network (no fabricated offline checkout).

Known limitations: not a full offline store; SW is intentionally minimal (no Workbox/paid PWA host); Supabase image transforms require a plan that supports them; numeric CWV/Lighthouse scores are environment-specific and must be measured.

### Security hardening (Phase 19)

See [SECURITY.md](./SECURITY.md) for secrets, RLS, payments, headers, and incident basics.

Highlights:

- Dropped customer `orders` / `order_items` insert RLS (payment pipeline / service role only)
- Media metadata no longer anonymously enumerable
- Coupon RLS write roles aligned with Admin RBAC
- Order detail/list service-role queries require user or admin+store scope
- Production guest cart requires `GUEST_CART_SECRET`
- Baseline security headers + pragmatic CSP (Razorpay/Supabase compatible)
- Best-effort in-process rate limits on auth, newsletter, coupons, checkout, webhooks

Migration: `20260908200000_security_hardening.sql`

```bash
npx supabase db push
```

### Pricing engine (Phase 11)

Single server-side source of truth for cart subtotals, checkout totals, and (later) order/Razorpay amounts:

```
subtotal − discount + shipping + paymentFee + tax = grandTotal
```

| Concern | Behavior |
| --- | --- |
| Money | Integer **minor units** internally (`majorToMinor` / `minorToMajor`); percentage fees use half-up `round(base × percent / 100)` |
| Currency | From `store_settings.currency` — never hardcode symbols in the engine |
| Shipping | `shipping_settings`: enabled, method (`flat_rate` + free threshold, `free`, `percentage`, `zone` fallback), fees from DB |
| Payment fee | `payment_settings`: optional PERCENTAGE/FIXED fee; default basis `SUBTOTAL_PLUS_SHIPPING`; **no secrets** in DB |
| Tax / discount | Engine fields exist; tax off by default; **coupons** resolve discount via `validateCoupon` → minor units into the engine |
| Authority | Always re-read catalog prices server-side before calculating |

Admin:

- `/${ADMIN_ROUTE}/settings/shipping` — `shipping.view` / `shipping.update`
- `/${ADMIN_ROUTE}/settings/payments` — `payments.view` / `payments.update`
- `/${ADMIN_ROUTE}/settings/coupons` — `coupons.view` / `create` / `update` / `delete`

Checkout displays the full engine breakdown (including coupon discount). Cart shows **subtotal only**, computed with the same minor-unit helpers.

### Coupons + discounts (Phase 14)

Reusable store-scoped coupons on existing `coupons` / `coupon_redemptions` tables. The pricing engine remains the single source of truth for money math.

| Concern | Behavior |
| --- | --- |
| Types | `percentage` and `fixed` (store currency / minor units) |
| Codes | Normalized uppercase; unique per store on `lower(code)`; customer entry is case-insensitive |
| Validation | Active, date window, usage / per-user limits, **minimum order vs subtotal**, discount caps — server-side only |
| Pricing | Client sends **code only**; server loads coupon and passes `discountMinor` into `calculateOrderPricing` |
| Apply vs redeem | Apply on checkout preview does **not** write redemptions |
| Redemption | After payment AUTHORIZED/CAPTURED inside `finalizePaidOrder`; race-safe via `redeem_coupon_for_order` RPC |
| Idempotency | Unique `(order_id)` on `coupon_redemptions` + RPC `already_redeemed` on retries |
| Order snapshot | `orders.coupon_code` + `orders.discount_amount` frozen at checkout session create |
| Admin | Store Settings → Coupons; EDITOR / ORDER_MANAGER view-only |
| Audit | `COUPON_CREATED`, `COUPON_UPDATED`, `COUPON_DISABLED`, `COUPON_DELETED`, `COUPON_REDEEMED` |
| RLS | No public coupon list; validation uses service role; redemptions readable by owner/admin |

Manual Supabase step (if not already applied):

```bash
npx supabase db push
```

Applies `20260908150000_coupon_redemption_rpc.sql` (index + redeem RPC). Do not edit older migrations.

Known limitations: product/category targeting is not enforced yet (hooks reserved); last-coupon races can leave a paid order without a redemption row if the limit is hit at finalize (activity logged).

### Razorpay payments (Phase 12)

Provider-agnostic payment layer with **Razorpay Standard Checkout** as the first provider.

| Concern | Behavior |
| --- | --- |
| Secrets | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` — server-only (never in DB / never `NEXT_PUBLIC_`) |
| Admin | `/${ADMIN_ROUTE}/settings/payments` — set provider to **Razorpay** + fee/tax; no secret fields |
| Checkout | `/checkout` → **Pay Now** creates pending order + payment, creates Razorpay Order server-side, opens Checkout.js |
| Authority | Amounts from pricing engine minor units; signature verified with **server-stored** `provider_order_id`; webhook is source of truth for sync |
| Webhook | `POST /api/webhooks/razorpay` — raw body + `X-Razorpay-Signature`; idempotent via `payment_webhook_events` |
| Results | `/payment/success`, `/payment/failed` load server-confirmed state (not query-param trust alone) |

### Orders + inventory finalization (Phase 13)

| Concern | Behavior |
| --- | --- |
| Lifecycle | PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED (CANCELLED / REFUNDED where allowed) |
| Finalization | `finalizePaidOrder` after verified AUTHORIZED/CAPTURED — confirms order, decrements stock once, clears cart |
| Inventory | Postgres `finalize_order_inventory` / `restore_order_inventory` RPCs; `inventory_movements` unique per `(order_item_id, SALE\|REVERSAL)` |
| Idempotency | Safe under Checkout handler + webhook retries (`inventory_finalized_at` + movement uniqueness) |
| Customer | `/account/orders`, `/account/orders/[id]`, `/account/payments` — own records only |
| Admin | `/${ADMIN_ROUTE}/orders` list + detail — status actions, tracking, local refund mark |
| Refunds | Local status + inventory restore only in this phase — **no automatic Razorpay Refund API call** |
| Tracking | Provider-neutral `shipping_provider` + `tracking_number` on orders |

#### Test-mode setup (manual)

1. Apply migration `20260908120000_payments_razorpay.sql`.
2. In Razorpay Dashboard (Test Mode), create API keys.
3. Set in `.env.local` (no real values in git):

```bash
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

4. Admin → Store Settings → Payments → Provider **Razorpay** → Save.
5. Expose your app (ngrok / staging) and register webhook URL:

`https://YOUR_HOST/api/webhooks/razorpay`

Enable at least: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`.

6. Place a test order as a signed-in customer with a saved address.

Automated tests mock signatures/amounts — they do **not** call live Razorpay.

Local webhook tip: use a tunnel so Razorpay can reach your machine; **do not** disable signature validation for localhost.

### Three.js

Import `SceneWrapper` only where a premium 3D section is needed. It dynamically loads the canvas so normal pages stay free of 3D bundle weight.

## Client deployments (later)

For each new client, expect to provide:

1. New Git repository (or branch strategy of your choice)
2. New Supabase project
3. Domain + `NEXT_PUBLIC_SITE_URL`
4. Brand / theme / navigation / SEO config
5. Catalog and business settings

Core architecture stays the same.

## License

Private template — update as needed for your organization.
