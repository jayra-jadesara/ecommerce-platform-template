# Security Guide

Practical security operations for this white-label ecommerce platform.  
**Do not treat `ADMIN_ROUTE` obscurity as a security boundary.**

## Principles

1. Treat all browser input as hostile.
2. Authorize on the server before any privileged or service-role access.
3. Resolve the active store from trusted server configuration — never from client-supplied `store_id`.
4. Pricing, inventory, coupons, and payments are server-authoritative.
5. Never put secrets in `NEXT_PUBLIC_*`, client bundles, logs, or error messages.

## Secrets

| Variable | Scope |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — bypasses RLS |
| `RAZORPAY_KEY_SECRET` | Server only |
| `RAZORPAY_WEBHOOK_SECRET` | Server only |
| `GUEST_CART_SECRET` | Server only — **required in production** for guest cart HMAC |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (RLS-enforced) |
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `RAZORPAY_KEY_ID` | Public key id (safe to send to Checkout) |

Checklist:

- [ ] Real values only in host secrets / `.env.local` (gitignored)
- [ ] Rotate keys after any suspected leak
- [ ] Never commit `.env`, credentials, or service-role keys
- [ ] Confirm production has `GUEST_CART_SECRET` set (no service-role fallback)

## Supabase

- Use the **anon** key in the browser with RLS.
- Use the **service role** only in `server-only` modules after authz.
- Prefer authenticated user clients when RLS is sufficient.
- Apply migrations with `npx supabase db push` (including `20260908200000_security_hardening.sql`).

## RLS (summary)

- Public read: active catalog, published CMS, branding/theme settings as designed.
- Customer write: own profile/addresses/cart/wishlist only.
- **Orders & order_items**: no direct customer insert — created by the privileged payment pipeline.
- **Media metadata table**: admin select/write only (public assets use Storage public URLs).
- **Coupons**: EDITOR/ORDER_MANAGER can select; only SUPER_ADMIN/ADMIN can mutate (aligned with app RBAC).
- Guest carts: no anon RLS; access via signed cookie + service role on the server.

## Storage

- Buckets: `branding`, `products`, `categories`, `cms` (public read); `media` (admin).
- App uploads: JPEG/PNG/WEBP with magic-byte checks; SVG rejected in app validation.
- Storage MIME lists hardened to drop SVG from branding/media where applicable.
- Paths must be store-scoped; path traversal (`..`) rejected.

## Authentication

- Supabase Auth sessions via `@supabase/ssr` cookies.
- Post-login redirects use `safeInternalPath` / `safeAdminNextPath` (blocks open redirects).
- Inactive admins are signed out and denied.
- Auth endpoints are rate-limited (best-effort in-process).

## Authorization (RBAC)

- `requireAdmin` / `requirePermission` on admin layouts and sensitive actions.
- Role map in `src/features/auth/permissions.ts` — EDITOR ≠ ORDER_MANAGER ≠ ADMIN.
- Service-role order queries require `userId` (customer) or `asAdmin` + `storeId`.

## Payments & webhooks

1. Server creates Razorpay order from pricing-engine totals.
2. Checkout signature verified with server-side secret + stored `provider_order_id`.
3. Amount/currency checked against provider payment.
4. Webhook: raw body HMAC, event allow-list, idempotent `payment_webhook_events`.
5. Payment state machine is forward-only.
6. Order finalization / inventory / coupon redeem are idempotent RPCs (service_role only).

Local refund markers must not claim a provider refund unless the Refund API is implemented.

## Checkout / cart / coupons

- Cart lines revalidated against catalog price and stock.
- Guest cart cookie: HttpOnly, Secure (production), SameSite=Lax, HMAC UUID.
- Coupon discounts calculated server-side; usage limits enforced in DB RPC.

## CMS

- Plain text / typed section configs — no arbitrary HTML/JS.
- URLs validated (`http(s)` or internal `/` paths).
- Draft pages are not served by public storefront loaders.

## PWA / cache

- Service worker must not cache account, cart, checkout, payment, admin, or `/api/*`.
- Public `unstable_cache` only for catalog/CMS/config — never private user data.

## Security headers

`next.config.ts` applies CSP (Razorpay/Supabase compatible), `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and `Permissions-Policy`.  
Tune CSP per deployment after measuring (fonts, analytics, extra CDNs).

## Rate limiting

In-process limits protect auth, newsletter, coupons, checkout starts, and webhooks.  
**Limitation:** not distributed across multiple instances — put WAF / edge limits in front for production scale.

## Dependency updates

```bash
npm audit
npm test
npm run typecheck
npm run lint
npm run build
```

Review advisories before upgrading. Prefer targeted fixes over blind major bumps.

## Incident response (basics)

1. Rotate Supabase service role, Razorpay secrets, and `GUEST_CART_SECRET`.
2. Invalidate sessions if auth compromise is suspected.
3. Review `audit_logs` / payment webhook events for the window.
4. Disable public signup / payments at the provider if needed.
5. Patch, redeploy, and verify with the security regression tests.

## Remaining known risks

- Distributed rate limiting requires infrastructure (CDN/WAF/Redis).
- CSP still allows `'unsafe-inline'` / `'unsafe-eval'` for Next.js + Checkout compatibility — tighten carefully.
- Public Storage buckets mean anyone with a URL can fetch those objects — treat paths as unguessable but not secret.
- Provider-side Razorpay / Supabase account controls are out of app scope.
- Backups, monitoring, and intrusion detection are operational responsibilities.
