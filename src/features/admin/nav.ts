import { getAdminPath } from "@/config/admin-route";
import type { Permission } from "@/features/auth/permissions";
import type { AdminNavItem } from "@/features/admin/components/AdminShell";

const ALL_NAV: Array<AdminNavItem & { permission: Permission }> = [
  { label: "Dashboard", href: getAdminPath("/dashboard"), permission: "dashboard.view" },
  { label: "Products", href: getAdminPath("/catalog/products"), permission: "products.view" },
  { label: "Categories", href: getAdminPath("/catalog/categories"), permission: "categories.view" },
  { label: "Orders", href: getAdminPath("/orders"), permission: "orders.view" },
  { label: "Customers", href: getAdminPath("/customers"), permission: "customers.view" },
  { label: "CMS", href: getAdminPath("/cms"), permission: "cms.view" },
  { label: "Media", href: getAdminPath("/media"), permission: "media.view" },
  { label: "Theme", href: getAdminPath("/settings/theme"), permission: "theme.view" },
  { label: "Branding", href: getAdminPath("/settings/branding"), permission: "branding.view" },
  { label: "Settings", href: getAdminPath("/settings"), permission: "settings.view" },
];

const SETTINGS_HUB_ALTERNATES: Permission[] = [
  "branding.view",
  "navigation.view",
  "seo.view",
  "theme.view",
];

export function getAdminNavForPermissions(
  permissions: Set<Permission>,
): AdminNavItem[] {
  return ALL_NAV.filter((item) => {
    if (item.label === "Settings") {
      return (
        permissions.has("settings.view") ||
        SETTINGS_HUB_ALTERNATES.some((permission) => permissions.has(permission))
      );
    }
    return permissions.has(item.permission);
  });
}
