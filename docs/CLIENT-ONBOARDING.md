# Client onboarding — white-label ecommerce template

Business-friendly steps to launch **one client** from this template.

## Model: one client = one stack

Each production client gets:

- Its own Git repository (cloned from this template)
- Its own Supabase project (Auth, Database, Storage)
- Its own domain
- Its own Razorpay account (or keys)
- Its own hosting project (e.g. Vercel)

This is the intended isolation model. Do not share one Supabase project across unpaid/unrelated clients.

## Checklist (0 → launch)

### 1. Create the client repository
1. Clone or use this repo as a GitHub template.
2. Create a **new** remote repository for the client.
3. Push the template code (no `.env.local`, no secrets).

### 2. Create Supabase
1. Create a new Supabase project.
2. Copy **Project URL**, **anon key**, and **service role key**.
3. Keep the service role key private.

### 3. Configure environment
1. Copy `.env.example` → `.env.local`.
2. Fill public and server values (see `.env.example` comments).
3. Set `NEXT_PUBLIC_SITE_URL` to the future domain (or localhost while developing).
4. Set `GUEST_CART_SECRET` to a long random string (required for production).

### 4. Apply migrations
```bash
npx supabase link --project-ref YOUR_REF
npx supabase db push
```
Or run the SQL migrations in order via the Supabase SQL editor.

### 5. System seed (roles)
Roles are in `supabase/seed.sql` (SUPER_ADMIN, ADMIN, EDITOR, ORDER_MANAGER).

Local: applied on `supabase db reset`.  
Remote: run `seed.sql` once, or let bootstrap scripts upsert roles.

### 6. Initialize the store
```bash
npm run init:store
# optional: STORE_NAME="Acme Shop" STORE_SLUG=acme npm run init:store
```
Creates a generic **My Store** (or your name) with theme/SEO/shipping/payment stubs.  
**No demo products** unless you intentionally run the demo seed.

### 7. Create the first admin
```bash
npm run bootstrap:admin
# or: ADMIN_EMAIL=you@client.com npm run bootstrap:admin
```
Open `/{ADMIN_ROUTE}/login` (default `/manage-store/login`).  
Change the password after first login.  
Customers **cannot** self-promote to admin.

### 8–12. Configure in Admin
Use the dashboard **Complete your store setup** checklist:

| Step | Where |
| --- | --- |
| Store information | Store Settings → General |
| Logo / branding | Store Settings → Branding |
| Theme | Store Settings → Appearance |
| Homepage / pages | Content |
| Categories & products | Catalog |
| Shipping | Store Settings → Shipping |
| Payments | Store Settings → Payments |
| SEO | Store Settings → Google & SEO |

### 13–14. Razorpay
1. Create Razorpay keys for this client.
2. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
3. In Admin, set payment provider to Razorpay.
4. Webhook URL: `https://CLIENT-DOMAIN/api/webhooks/razorpay`

### 15. Deploy
See [DEPLOYMENT.md](./DEPLOYMENT.md) (Vercel + env + domain).

### 16. Domain & Auth redirects
1. Point DNS to the host.
2. Set `NEXT_PUBLIC_SITE_URL=https://client-domain.com`.
3. In Supabase Auth → URL configuration, allow:
   - `https://client-domain.com/**`
   - `https://client-domain.com/auth/callback`

### 17. Verify
```bash
npm run verify:production
```
Then manually: homepage, product, cart, checkout smoke test, admin login, webhook test event.

## Optional demo catalog

**DEMO ONLY** — not for production clients:

```bash
# After migrations + init:store, in Supabase SQL editor:
# run supabase/seed-demo.sql
```

Creates `demo-category` / `demo-product`. Delete before go-live.

## What not to do

- Do not commit secrets.
- Do not reuse another client’s Supabase or Razorpay keys.
- Do not rely on `ADMIN_ROUTE` secrecy for security.
- Do not run `seed-demo.sql` on a live client DB unless you want sample products.
