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
| `RAZORPAY_KEY_ID` | Razorpay key id (server, later) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret (server, later) |

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
| Tax / discount | Engine fields exist; tax off by default; coupons not implemented (`discount = 0`) |
| Authority | Always re-read catalog prices server-side before calculating |

Admin:

- `/${ADMIN_ROUTE}/settings/shipping` — `shipping.view` / `shipping.update`
- `/${ADMIN_ROUTE}/settings/payments` — `payments.view` / `payments.update`

Checkout displays the full engine breakdown. Cart shows **subtotal only**, computed with the same minor-unit helpers.

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
