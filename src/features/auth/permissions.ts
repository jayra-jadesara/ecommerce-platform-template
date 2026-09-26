import {
  isSystemAdminRoleCode,
  type AdminRoleCode,
  type SystemAdminRoleCode,
} from "@/types/database";

export type { SystemAdminRoleCode };
export { isSystemAdminRoleCode };

export const PERMISSIONS = [
  "dashboard.view",
  /** Dashboard page cards — grantable separately in custom roles. */
  "dash_overview.view",
  "dash_charts.view",
  "dash_attention.view",
  "dash_recent.view",
  "products.view",
  "products.create",
  "products.update",
  "products.delete",
  "reviews.view",
  "reviews.moderate",
  "categories.view",
  "categories.create",
  "categories.update",
  "categories.delete",
  "inventory.view",
  "inventory.update",
  "orders.view",
  "orders.update",
  "customers.view",
  "customers.password",
  "customers.delete",
  "cms.view",
  "cms.create",
  "cms.update",
  "cms.delete",
  "content.view",
  "content.create",
  "content.update",
  "content.delete",
  "content.publish",
  "media.view",
  "media.upload",
  "media.update",
  "media.delete",
  "product_images.view",
  "product_images.upload",
  "product_images.update",
  "product_images.delete",
  "settings.view",
  "settings.update",
  /** Store layout / hosting — split from settings.view for custom roles. */
  "settings_header.view",
  "settings_header.update",
  "settings_footer.view",
  "settings_footer.update",
  "platform.view",
  "branding.view",
  "branding.update",
  "navigation.view",
  "navigation.update",
  "seo.view",
  "seo.update",
  "theme.view",
  "theme.update",
  "shipping.view",
  "shipping.update",
  "payments.view",
  "payments.update",
  "coupons.view",
  "coupons.create",
  "coupons.update",
  "coupons.delete",
  "blog.view",
  "blog.create",
  "blog.update",
  "blog.delete",
  "blog.publish",
  "users.view",
  "users.manage",
  "audit.view",
  "error_logs.view",
  "error_logs.update",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

/** Default dashboard cards when a role can open Dashboard. */
const DASHBOARD_CARD_PERMISSIONS = [
  "dash_overview.view",
  "dash_charts.view",
  "dash_attention.view",
  "dash_recent.view",
] as const satisfies readonly Permission[];

/** Header / footer / hosting when a role can open Store settings. */
const SETTINGS_DETAIL_PERMISSIONS = [
  "settings_header.view",
  "settings_header.update",
  "settings_footer.view",
  "settings_footer.update",
  "platform.view",
] as const satisfies readonly Permission[];

const SETTINGS_DETAIL_VIEW_ONLY = [
  "settings_header.view",
  "settings_footer.view",
  "platform.view",
] as const satisfies readonly Permission[];

export const ROLE_PERMISSIONS: Record<
  SystemAdminRoleCode,
  readonly Permission[]
> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: [
    "dashboard.view",
    ...DASHBOARD_CARD_PERMISSIONS,
    "products.view",
    "products.create",
    "products.update",
    "products.delete",
    "reviews.view",
    "reviews.moderate",
    "categories.view",
    "categories.create",
    "categories.update",
    "categories.delete",
    "inventory.view",
    "inventory.update",
    "orders.view",
    "orders.update",
    "customers.view",
    "customers.password",
    "customers.delete",
    "cms.view",
    "cms.create",
    "cms.update",
    "cms.delete",
    "content.view",
    "content.create",
    "content.update",
    "content.delete",
    "content.publish",
    "media.view",
    "media.upload",
    "media.update",
    "media.delete",
    "product_images.view",
    "product_images.upload",
    "product_images.update",
    "product_images.delete",
    "settings.view",
    "settings.update",
    ...SETTINGS_DETAIL_PERMISSIONS,
    "branding.view",
    "branding.update",
    "navigation.view",
    "navigation.update",
    "seo.view",
    "seo.update",
    "theme.view",
    "theme.update",
    "shipping.view",
    "shipping.update",
    "payments.view",
    "payments.update",
    "coupons.view",
    "coupons.create",
    "coupons.update",
    "coupons.delete",
    "blog.view",
    "blog.create",
    "blog.update",
    "blog.delete",
    "blog.publish",
    "error_logs.view",
    "error_logs.update",
  ],
  EDITOR: [
    "dashboard.view",
    ...DASHBOARD_CARD_PERMISSIONS,
    "products.view",
    "products.create",
    "products.update",
    "reviews.view",
    "reviews.moderate",
    "categories.view",
    "categories.create",
    "categories.update",
    "inventory.view",
    "inventory.update",
    "cms.view",
    "cms.create",
    "cms.update",
    "cms.delete",
    "content.view",
    "content.create",
    "content.update",
    "content.delete",
    "content.publish",
    "media.view",
    "media.upload",
    "media.update",
    "product_images.view",
    "product_images.upload",
    "product_images.update",
    "branding.view",
    "branding.update",
    "navigation.view",
    "navigation.update",
    "seo.view",
    "seo.update",
    "theme.view",
    "shipping.view",
    "coupons.view",
    "blog.view",
    "blog.create",
    "blog.update",
    "blog.publish",
    "error_logs.view",
  ],
  ORDER_MANAGER: [
    "dashboard.view",
    ...DASHBOARD_CARD_PERMISSIONS,
    "orders.view",
    "orders.update",
    "customers.view",
    "customers.password",
    "payments.view",
    "inventory.view",
    "coupons.view",
    "error_logs.view",
  ],
  MARKETING: [
    "dashboard.view",
    ...DASHBOARD_CARD_PERMISSIONS,
    "products.view",
    "categories.view",
    "reviews.view",
    "reviews.moderate",
    "cms.view",
    "cms.create",
    "cms.update",
    "content.view",
    "content.create",
    "content.update",
    "content.publish",
    "media.view",
    "media.upload",
    "media.update",
    "product_images.view",
    "branding.view",
    "seo.view",
    "seo.update",
    "coupons.view",
    "coupons.create",
    "coupons.update",
    "coupons.delete",
    "blog.view",
    "blog.create",
    "blog.update",
    "blog.publish",
    "error_logs.view",
  ],
  SUPPORT: [
    "dashboard.view",
    ...DASHBOARD_CARD_PERMISSIONS,
    "products.view",
    "categories.view",
    "inventory.view",
    "orders.view",
    "orders.update",
    "customers.view",
    "customers.password",
    "payments.view",
    "error_logs.view",
  ],
  READER: [
    "dashboard.view",
    ...DASHBOARD_CARD_PERMISSIONS,
    "products.view",
    "reviews.view",
    "categories.view",
    "inventory.view",
    "orders.view",
    "customers.view",
    "cms.view",
    "content.view",
    "media.view",
    "product_images.view",
    "settings.view",
    ...SETTINGS_DETAIL_VIEW_ONLY,
    "branding.view",
    "navigation.view",
    "seo.view",
    "theme.view",
    "shipping.view",
    "payments.view",
    "coupons.view",
    "blog.view",
    "error_logs.view",
  ],
};

export function permissionsForRoles(roles: AdminRoleCode[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) {
    if (!isSystemAdminRoleCode(role)) continue;
    const list = ROLE_PERMISSIONS[role];
    if (!list) continue;
    for (const permission of list) set.add(permission);
  }
  return set;
}

/** Merge TS system map + DB permission strings (unknown strings ignored). */
export function mergePermissionSets(
  ...sets: Array<Iterable<string> | Set<string> | null | undefined>
): Set<Permission> {
  const allowed = new Set<string>(PERMISSIONS);
  const out = new Set<Permission>();
  for (const set of sets) {
    if (!set) continue;
    for (const p of set) {
      if (allowed.has(p)) out.add(p as Permission);
    }
  }
  return out;
}

export function hasPermission(
  roles: AdminRoleCode[],
  permission: Permission,
): boolean {
  return permissionsForRoles(roles).has(permission);
}

export function hasAnyRole(
  roles: AdminRoleCode[],
  required: AdminRoleCode[],
): boolean {
  return required.some((role) => roles.includes(role));
}
