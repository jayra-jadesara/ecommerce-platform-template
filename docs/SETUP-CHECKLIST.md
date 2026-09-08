# Configuration checklist

Use after `init:store` + first admin login. Mark items when done.

## Store
- [ ] Store name (not “My Store”)
- [ ] Currency / locale / timezone
- [ ] Contact email / phone
- [ ] `STORE_SLUG` set if multiple stores (usually one)

## Branding
- [ ] Logo (light)
- [ ] Dark logo (optional)
- [ ] Favicon
- [ ] Tagline
- [ ] Social share image (optional)

## Theme / appearance
- [ ] Primary / accent colors
- [ ] Light & dark review
- [ ] Animation preferences
- [ ] 3D effects only if needed (off by default)

## Content
- [ ] Homepage sections published
- [ ] About / contact / policies pages
- [ ] Navigation labels & links

## Catalog
- [ ] Categories
- [ ] Products + variants + prices
- [ ] Images
- [ ] Inventory levels

## Shipping
- [ ] Method enabled
- [ ] Fees / free-shipping threshold
- [ ] Delivery estimate copy (optional)

## Payments
- [ ] Provider = Razorpay (when ready) or none
- [ ] Env keys set on host
- [ ] Webhook configured
- [ ] Test payment in Razorpay test mode

## SEO
- [ ] Site title & description
- [ ] `NEXT_PUBLIC_SITE_URL` = production domain
- [ ] robots allow public pages
- [ ] Sitemap reachable

## Admin
- [ ] First admin password changed
- [ ] Additional staff roles only if needed
- [ ] `ADMIN_ROUTE` noted for the team

## Domain / launch
- [ ] DNS + HTTPS
- [ ] Supabase Auth redirect URLs
- [ ] `npm run verify:production`
- [ ] Smoke test storefront + checkout
