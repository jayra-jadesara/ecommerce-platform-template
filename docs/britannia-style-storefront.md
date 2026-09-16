# Britannia-inspired storefront (admin how-to)

Admin-driven brand chrome inspired by campaign-style ecommerce sites. Colors always come from **your logo / theme tokens** — not a fixed red/yellow palette.

## Homepage hero slideshow

1. Admin → **Content → Homepage**
2. Edit the **Hero Banner** section
3. Under **Slideshow images**, add up to 8 slides (image required per slide)
4. Optional per slide: headline, badge, button text + destination
5. Set **Autoplay interval** (ms; `0` disables) and arrows
6. Save section → **Publish** homepage

When slides exist, the storefront uses the split primary-panel + image carousel. With no slides, the classic single background/side image layout still works.

**Products between sections:** add **Product Grid** sections and drag to reorder in the Homepage Builder (already supported).

## Larger logo

Admin → **Settings → Header** → **Logo size** → **Extra large (brand hero)**.

## Footer featured product

1. Apply migration `20260916140000_footer_featured_product.sql` (`npx supabase db push` or SQL editor)
2. Admin → **Settings → Footer**
3. Enable **Show featured product above footer**
4. Pick a product → Save

## Product share

On product pages: Facebook / X share the product URL, Copy link, native share when available. Instagram / YouTube open **store profile URLs** from **Settings → Store information → Social links** (those apps lack reliable “share this URL” web intents).

## Blog article layout

`/blog/[slug]` uses a centered brand article header, accent bar, wide rounded hero image, share row, and themed markdown body. Manage content in **Content → Blog**.

## Back to top

Primary-colored “Back to top” tab appears after scrolling (theme primary).

## Theme from logo

1. Upload logo under **Settings → Branding**
2. Click **Generate** (creates light + dark from logo colors)
3. Open **Appearance** → **Apply suggested theme** → **Save**

**Light** (Britannia-style harmony from your logo): cream page, brand-red CTAs/social chips, warm yellow/gold **footer** derived from the logo accent (or a warm companion when the logo has one hue).

**Dark**: near-black chrome with a **dark footer** (not the light yellow band). The storefront footer reads `--color-footer-background` / `--color-footer-foreground`, so each mode can look intentional.

Existing saved themes do not change until you regenerate and apply again.

## Related migrations

- `20260916120000_blog_cover_card_style.sql` — COVER blog cards
- `20260916140000_footer_featured_product.sql` — footer product columns
