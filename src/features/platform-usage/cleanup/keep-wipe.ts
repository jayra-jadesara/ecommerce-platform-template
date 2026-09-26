import type { CleanupActionId } from "@/features/platform-usage/cleanup/types";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import type { Database } from "@/types/database";

export type PublicTable = keyof Database["public"]["Tables"];

/** Never delete or truncate these — platform shell + master data. */
export const KEEP_TABLES = [
  "stores",
  "store_settings",
  "store_branding",
  "store_theme_settings",
  "store_animation_settings",
  "store_visual_effects_settings",
  "store_seo_settings",
  "shipping_settings",
  "payment_settings",
  "roles",
  "role_permissions",
  "admin_users",
  "admin_user_roles",
  "india_states",
  "india_cities",
] as const satisfies readonly PublicTable[];

export type KeepTable = (typeof KEEP_TABLES)[number];

/**
 * Format reset DB wipe order (children before parents; RESTRICT FKs first).
 * Must not include any KEEP_TABLES entry.
 */
export const FORMAT_RESET_TABLE_ORDER = [
  "order_replace_requests",
  "order_activities",
  "inventory_movements",
  "payment_webhook_events",
  "payments",
  "coupon_redemptions",
  "order_items",
  "orders",
  "cart_items",
  "carts",
  "wishlist_items",
  "wishlists",
  "product_reviews",
  "store_reel_products",
  "blog_post_products",
  "blog_post_categories",
  "inventory",
  "product_images",
  "product_variants",
  "products",
  "categories",
  "product_size_options",
  "coupons",
  "career_applications",
  "job_posts",
  "page_sections",
  "pages",
  "banners",
  "navigation_items",
  "certifications",
  "contact_inquiries",
  "store_reels",
  "store_brochures",
  "newsletter_subscribers",
  "blog_posts",
  "blog_categories",
  "media",
  "audit_logs",
  "error_logs",
  "storefront_sync_events",
] as const satisfies readonly PublicTable[];

export const CLEAR_ORDERS_TABLE_ORDER = [
  "order_replace_requests",
  "order_activities",
  "payment_webhook_events",
  "payments",
  "coupon_redemptions",
  "order_items",
  "orders",
] as const satisfies readonly PublicTable[];

export const CLEAR_ACTIVITY_TABLE_ORDER = [
  "audit_logs",
  "error_logs",
  "storefront_sync_events",
  "order_activities",
  "inventory_movements",
] as const satisfies readonly PublicTable[];

/** Storage buckets wiped on format reset (never branding). */
export const FORMAT_RESET_STORAGE_BUCKETS = [
  STORAGE_BUCKETS.products,
  STORAGE_BUCKETS.categories,
  STORAGE_BUCKETS.cms,
  STORAGE_BUCKETS.media,
  STORAGE_BUCKETS.reels,
  STORAGE_BUCKETS.brochures,
  STORAGE_BUCKETS.replacements,
] as const;

export const REPLACE_PHOTOS_BUCKET = STORAGE_BUCKETS.replacements;

export const CONFIRM_PHRASES: Record<CleanupActionId, string> = {
  format_reset: "RESET",
  clear_orders_payments: "CLEAR",
  clear_activity_logs: "CLEAR",
  clear_replace_photos: "CLEAR",
  purge_older_than: "CLEAR",
};

export const ACTION_META: Record<
  CleanupActionId,
  { title: string; description: string }
> = {
  format_reset: {
    title: "Format reset",
    description:
      "Clears catalog, orders, payments, CMS content, media files, logs, and shopper accounts. Keeps store settings, branding, payment credentials, team, system roles, and India geo.",
  },
  clear_orders_payments: {
    title: "Clear orders & payments",
    description:
      "Removes all orders, payments, webhooks, coupon redemptions, and replace-request photos. Catalog and customers stay.",
  },
  clear_activity_logs: {
    title: "Clear activity & logs",
    description:
      "Deletes audit logs, error logs, sync events, order activity history, and inventory movement history.",
  },
  clear_replace_photos: {
    title: "Clear replace photos",
    description:
      "Deletes customer replace-request photos from storage and clears photo paths. Request rows stay.",
  },
  purge_older_than: {
    title: "Delete older data",
    description:
      "Frees space like large sites: removes orders, payments, activity, and replace photos older than the period you choose. Catalog, customers, and settings stay.",
  },
};

export const TABLE_LABELS: Partial<Record<PublicTable, string>> = {
  order_replace_requests: "Replace requests",
  order_activities: "Order activity",
  inventory_movements: "Inventory movements",
  payment_webhook_events: "Payment webhooks",
  payments: "Payments",
  coupon_redemptions: "Coupon redemptions",
  order_items: "Order lines",
  orders: "Orders",
  cart_items: "Cart lines",
  carts: "Carts",
  wishlist_items: "Wishlist lines",
  wishlists: "Wishlists",
  product_reviews: "Reviews",
  store_reel_products: "Reel products",
  blog_post_products: "Blog product links",
  blog_post_categories: "Blog post categories",
  inventory: "Inventory",
  product_images: "Product images",
  product_variants: "Variants",
  products: "Products",
  categories: "Categories",
  product_size_options: "Size options",
  coupons: "Coupons",
  career_applications: "Career applications",
  job_posts: "Job posts",
  page_sections: "Page sections",
  pages: "Pages",
  banners: "Banners",
  navigation_items: "Navigation",
  certifications: "Certifications",
  contact_inquiries: "Contact inquiries",
  store_reels: "Reels",
  store_brochures: "Brochures",
  newsletter_subscribers: "Newsletter",
  blog_posts: "Blog posts",
  blog_categories: "Blog categories",
  media: "Media library",
  audit_logs: "Audit logs",
  error_logs: "Error logs",
  storefront_sync_events: "Sync events",
};

export function assertWipeSafe(tables: readonly string[]): void {
  const keep = new Set<string>(KEEP_TABLES);
  for (const table of tables) {
    if (keep.has(table)) {
      throw new Error(`Refusing to wipe keep-table: ${table}`);
    }
  }
}

export function isConfirmPhraseValid(
  action: CleanupActionId,
  phrase: string,
): boolean {
  return phrase.trim().toUpperCase() === CONFIRM_PHRASES[action];
}
