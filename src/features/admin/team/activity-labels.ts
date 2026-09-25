/** Friendly labels for common audit_logs.action values. */
const ACTION_LABELS: Record<string, string> = {
  ADMIN_USER_ADDED: "Added to team",
  ADMIN_USER_CREATED: "Staff account created",
  ADMIN_ROLES_UPDATED: "Role changed",
  ADMIN_USER_ACTIVATED: "Admin access turned on",
  ADMIN_USER_DEACTIVATED: "Admin access turned off",
  PRODUCT_CREATED: "Created a product",
  PRODUCT_UPDATED: "Updated a product",
  PRODUCT_DELETED: "Deleted a product",
  PRODUCT_ARCHIVED: "Archived a product",
  PRODUCT_IMAGE_ADDED: "Added a product photo",
  PRODUCT_IMAGE_DELETED: "Removed a product photo",
  PRODUCT_IMAGE_UPDATED: "Updated a product photo",
  CATEGORY_CREATED: "Created a category",
  CATEGORY_UPDATED: "Updated a category",
  CATEGORY_DELETED: "Deleted a category",
  MEDIA_UPLOADED: "Uploaded a file",
  MEDIA_DELETED: "Deleted a file",
  MEDIA_UPDATED: "Updated a file",
  ORDER_STATUS_UPDATED: "Updated an order",
  ORDER_CREATED: "Order created",
  INVENTORY_DECREMENTED: "Inventory decremented",
  INVENTORY_RESTORED: "Inventory restored",
  COD_ORDER_PLACED: "COD order placed",
  COD_PAYMENT_CAPTURED: "COD payment captured",
  BRANDING_UPDATED: "Updated branding",
  SETTINGS_UPDATED: "Updated store settings",
  STORE_SETTINGS_UPDATED: "Updated store settings",
  THEME_UPDATED: "Updated appearance",
  HEADER_SETTINGS_UPDATED: "Updated header",
  FOOTER_SETTINGS_UPDATED: "Updated footer",
  SEO_SETTINGS_UPDATED: "Updated SEO",
  NAVIGATION_SETTINGS_UPDATED: "Updated navigation",
  NAVIGATION_UPDATED: "Updated navigation",
  GENERAL_SETTINGS_UPDATED: "Updated general settings",
  SHIPPING_SETTINGS_UPDATED: "Updated shipping",
  PAYMENT_SETTINGS_UPDATED: "Updated payments",
  ERROR_LOG_CREATED: "Logged an error",
  ERROR_LOG_RESOLVED: "Resolved an error",
  ERROR_LOG_IGNORED: "Ignored an error",
  ERROR_LOG_INVESTIGATING: "Investigating an error",
  COUPON_CREATED: "Created a coupon",
  COUPON_UPDATED: "Updated a coupon",
  COUPON_DELETED: "Deleted a coupon",
  // Content / CMS
  PAGE_CREATED: "Created a page",
  PAGE_UPDATED: "Updated a page",
  PAGE_SEO_UPDATED: "Updated page SEO",
  PAGE_PUBLISHED: "Published a page",
  PAGE_UNPUBLISHED: "Unpublished a page",
  PAGE_ARCHIVED: "Archived a page",
  HOMEPAGE_UPDATED: "Updated the homepage",
  HOMEPAGE_PUBLISHED: "Published the homepage",
  SECTION_CREATED: "Added a page section",
  SECTION_UPDATED: "Updated a page section",
  SECTION_REORDERED: "Reordered page sections",
  SECTION_DELETED: "Deleted a page section",
  BANNER_CREATED: "Created a banner",
  BANNER_UPDATED: "Updated a banner",
  BANNER_DELETED: "Deleted a banner",
  JOB_POST_CREATED: "Created a job post",
  JOB_POST_UPDATED: "Updated a job post",
  JOB_POST_DELETED: "Deleted a job post",
  // Blog
  BLOG_POST_CREATED: "Created a blog post",
  BLOG_POST_UPDATED: "Updated a blog post",
  BLOG_POST_PUBLISHED: "Published a blog post",
  BLOG_POST_UNPUBLISHED: "Unpublished a blog post",
  BLOG_POST_ARCHIVED: "Archived a blog post",
  BLOG_POST_DELETED: "Deleted a blog post",
  BLOG_CATEGORY_CREATED: "Created a blog category",
  BLOG_CATEGORY_UPDATED: "Updated a blog category",
  BLOG_CATEGORY_DELETED: "Deleted a blog category",
  BLOG_SETTINGS_UPDATED: "Updated blog settings",
  // Brochures
  BROCHURE_CREATED: "Created a brochure",
  BROCHURE_UPDATED: "Updated a brochure",
  BROCHURE_DELETED: "Deleted a brochure",
  BROCHURE_PDF_UPLOADED: "Uploaded a brochure PDF",
  BROCHURE_PAGE_DESCRIPTION_UPDATED: "Updated brochure page intro",
  BROCHURE_PDF_MAX_MB_UPDATED: "Updated brochure PDF size limit",
};

const ENTITY_LABELS: Record<string, string> = {
  admin_users: "Team",
  products: "Product",
  product_images: "Product photo",
  categories: "Category",
  media: "Media",
  order: "Order",
  orders: "Order",
  payment: "Payment",
  payments: "Payment",
  coupon: "Coupon",
  coupons: "Coupon",
  inventory: "Inventory",
  store_branding: "Branding",
  store_settings: "Settings",
  store_theme: "Appearance",
  store_theme_settings: "Appearance",
  store_header: "Header",
  store_footer: "Footer",
  store_seo: "SEO",
  store_seo_settings: "SEO",
  store_navigation: "Navigation",
  navigation_items: "Navigation",
  shipping_settings: "Shipping",
  payment_settings: "Payments",
  error_log: "Error",
  error_logs: "Error",
  cms: "Content",
  blog_post: "Blog post",
  blog_posts: "Blog post",
  blog_category: "Blog category",
  blog_settings: "Blog settings",
  page: "Page",
  pages: "Page",
  page_section: "Page section",
  homepage: "Homepage",
  store_brochure: "Brochure",
  store_brochures: "Brochure",
  store_reel: "Reel",
  store_reels: "Reel",
  job_post: "Job",
  job_posts: "Job",
  banner: "Banner",
  banners: "Banner",
};

export function staffActionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function staffEntityLabel(entityType: string): string {
  return (
    ENTITY_LABELS[entityType] ??
    entityType
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

/** Soft accent for timeline / chips by entity area — theme tokens only. */
export function staffEntityTone(entityType: string): {
  chip: string;
  dot: string;
} {
  const key = entityType.toLowerCase();
  if (key.includes("product") || key.includes("categor")) {
    return {
      chip: "bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-card))] text-[var(--color-success)] border-[color-mix(in_srgb,var(--color-success)_28%,var(--color-border))]",
      dot: "bg-[var(--color-success)]",
    };
  }
  if (key.includes("order") || key.includes("payment") || key.includes("coupon")) {
    return {
      chip: "bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--color-card))] text-[var(--color-accent)] border-[color-mix(in_srgb,var(--color-accent)_28%,var(--color-border))]",
      dot: "bg-[var(--color-accent)]",
    };
  }
  if (key.includes("media") || key.includes("brand") || key.includes("theme")) {
    return {
      chip: "bg-[color-mix(in_srgb,var(--color-secondary)_14%,var(--color-card))] text-[var(--color-secondary)] border-[color-mix(in_srgb,var(--color-secondary)_30%,var(--color-border))]",
      dot: "bg-[var(--color-secondary)]",
    };
  }
  if (key.includes("admin") || key.includes("user") || key.includes("team")) {
    return {
      chip: "bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[var(--color-primary)] border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))]",
      dot: "bg-[var(--color-primary)]",
    };
  }
  if (
    key.includes("blog") ||
    key.includes("page") ||
    key.includes("brochure") ||
    key.includes("reel") ||
    key.includes("banner") ||
    key.includes("job") ||
    key.includes("cms") ||
    key.includes("homepage")
  ) {
    return {
      chip: "bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] text-[var(--color-primary)] border-[color-mix(in_srgb,var(--color-primary)_26%,var(--color-border))]",
      dot: "bg-[var(--color-primary)]",
    };
  }
  if (key.includes("error")) {
    return {
      chip: "bg-[color-mix(in_srgb,var(--color-error)_10%,var(--color-card))] text-[var(--color-error)] border-[color-mix(in_srgb,var(--color-error)_25%,var(--color-border))]",
      dot: "bg-[var(--color-error)]",
    };
  }
  return {
    chip: "bg-[var(--color-surface)] text-[var(--color-foreground)] border-[var(--color-border)]",
    dot: "bg-[var(--color-muted)]",
  };
}
