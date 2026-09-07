# White-Label E-Commerce Platform Template

Reusable, production-oriented foundation for multi-client storefronts. Deploy a new client with a new repository, Supabase project, domain, brand, and catalog — without rewriting core architecture.

**Phase 1** delivers the application shell: config-driven theme, layout, design tokens, providers, and feature folder structure. Supabase, cart, checkout, payments, and admin are intentionally not implemented yet.

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

## Environment variables

See `.env.example`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (later) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (later) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for SEO |
| `RAZORPAY_KEY_ID` | Razorpay key id (server, later) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret (server, later) |

Never commit `.env` or `.env.local`.

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
  services/            # Data-access stubs (Supabase later)
  types/               # PlatformConfig contracts
  validations/         # Shared Zod schemas
  styles/              # Semantic design tokens
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
