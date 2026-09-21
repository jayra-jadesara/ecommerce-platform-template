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
  store_seo_settings: "SEO",
  navigation_items: "Navigation",
  shipping_settings: "Shipping",
  payment_settings: "Payments",
  error_log: "Error",
  error_logs: "Error",
  cms: "Content",
  blog_posts: "Blog",
  pages: "Page",
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

/** Soft accent for timeline / chips by entity area. */
export function staffEntityTone(entityType: string): {
  chip: string;
  dot: string;
} {
  const key = entityType.toLowerCase();
  if (key.includes("product") || key.includes("categor")) {
    return {
      chip: "bg-[color-mix(in_srgb,#0d9488_12%,var(--color-card))] text-[#0f766e] border-[color-mix(in_srgb,#0d9488_28%,var(--color-border))]",
      dot: "bg-[#0d9488]",
    };
  }
  if (key.includes("order") || key.includes("payment") || key.includes("coupon")) {
    return {
      chip: "bg-[color-mix(in_srgb,#2563eb_12%,var(--color-card))] text-[#1d4ed8] border-[color-mix(in_srgb,#2563eb_28%,var(--color-border))]",
      dot: "bg-[#2563eb]",
    };
  }
  if (key.includes("media") || key.includes("brand") || key.includes("theme")) {
    return {
      chip: "bg-[color-mix(in_srgb,#9333ea_12%,var(--color-card))] text-[#7e22ce] border-[color-mix(in_srgb,#9333ea_28%,var(--color-border))]",
      dot: "bg-[#9333ea]",
    };
  }
  if (key.includes("admin") || key.includes("user") || key.includes("team")) {
    return {
      chip: "bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[var(--color-primary)] border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))]",
      dot: "bg-[var(--color-primary)]",
    };
  }
  if (key.includes("error")) {
    return {
      chip: "bg-[color-mix(in_srgb,#dc2626_10%,var(--color-card))] text-[#b91c1c] border-[color-mix(in_srgb,#dc2626_25%,var(--color-border))]",
      dot: "bg-[#dc2626]",
    };
  }
  return {
    chip: "bg-[var(--color-surface)] text-[var(--color-foreground)] border-[var(--color-border)]",
    dot: "bg-[var(--color-muted)]",
  };
}
