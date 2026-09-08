# Deployment guide

Technical steps to deploy one white-label client. Nothing here is automatic unless you run the listed commands.

## Prerequisites

- Node.js 20+
- npm 10+
- GitHub repository for the client
- Supabase project for the client
- Hosting account (this guide uses **Vercel** as the common path)
- Razorpay account (when accepting online payments)

## 1. Repository

1. Clone the template into a new client repo.
2. Ensure `.env`, `.env.local`, and secrets are **not** committed (see `.gitignore`).
3. Tag or note `package.json` `version` when you cut a client release.

## 2. Supabase

1. Create project → copy URL, anon key, service role key.
2. Link and push migrations:

```bash
npx supabase login
npx supabase link --project-ref YOUR_REF
npx supabase db push
```

3. Confirm in Dashboard:
   - Tables exist
   - RLS enabled on public tables
   - Storage buckets: `branding`, `products`, `categories`, `cms`, `media`
   - Roles rows after system seed / `npm run init:store`

### Storage path convention

| Bucket | Path pattern |
| --- | --- |
| products | `products/{store_id}/{product_id}/...` |
| categories | `categories/{store_id}/{category_id}/...` |
| branding | `branding/{store_id}/...` |
| cms | `cms/{store_id}/...` |
| media | `media/{store_id}/...` |

### Auth URLs

Site URL + redirect allow-list must include the production domain and `/auth/callback`.

## 3. Environment variables (Vercel / host)

Set the same keys as `.env.example`:

**Public:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`  
**Server:** `SUPABASE_SERVICE_ROLE_KEY`, `GUEST_CART_SECRET`, `ADMIN_ROUTE` (optional), `STORE_SLUG` (optional)  
**Payments (if used):** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

Never prefix secrets with `NEXT_PUBLIC_`.

## 4. Initialize store + admin (once)

From a machine with `.env.local` pointed at the **client** project:

```bash
npm run init:store
npm run bootstrap:admin
```

Then configure branding/theme/catalog in Admin.

## 5. Vercel

1. Import the client GitHub repo.
2. Framework: Next.js (auto).
3. Add environment variables for Production (and Preview if desired).
4. Deploy.
5. Attach the custom domain; enable HTTPS (Vercel default).

Rebuild after changing env vars.

## 6. Domain

1. DNS → Vercel (or your host).
2. `NEXT_PUBLIC_SITE_URL=https://client-domain.com`
3. Supabase Auth redirect URLs updated.
4. Sitemap/robots/manifest/metadata pick up the site URL automatically.

## 7. Razorpay webhook

1. Razorpay Dashboard → Webhooks → add  
   `https://client-domain.com/api/webhooks/razorpay`
2. Paste the webhook secret into `RAZORPAY_WEBHOOK_SECRET`.
3. Enable payment captured / failed (and related) events matching the app allow-list.

## 8. PWA

Manifest is store-aware (branding name/colors/icons).  
Service worker registers in production; private routes are network-only.  
No client-specific brand is hard-coded.

## 9. Admin URL

Default: `/manage-store`. Override with `ADMIN_ROUTE`.  
Security remains Auth + RBAC + RLS + server checks (see [SECURITY.md](../SECURITY.md)).

## 10. Pre-flight

```bash
npm run verify:production
```

Runs env checks (without printing secrets), secret scan, tests, typecheck, lint, and build.

## 11. Post-deploy smoke test

- [ ] Homepage loads with client branding
- [ ] Products list / product detail
- [ ] Cart + checkout (test mode)
- [ ] Admin login + dashboard checklist
- [ ] Payment success/fail pages
- [ ] `/sitemap.xml` and `/robots.txt`
- [ ] Webhook delivery (Razorpay dashboard)

## Updating a client from the master template

Each client repo is independent. To pull platform fixes:

1. Add the master template as a remote (or use a release branch).
2. Cherry-pick / merge carefully.
3. Resolve conflicts in client-only docs or env samples.
4. Re-run `npm test` / `npm run verify:production`.
5. Never overwrite client Supabase data or secrets.

Do **not** auto-force `npm audit --force` upgrades without review.
