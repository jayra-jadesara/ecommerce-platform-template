import { getAdminPath } from "@/config/admin-route";
import type { Permission } from "@/features/auth/permissions";

export type AdminNavIcon =
  | "dashboard"
  | "products"
  | "orders"
  | "customers"
  | "content"
  | "settings";

export type AdminNavLink = {
  kind: "link";
  id: string;
  label: string;
  href: string;
  /** Any of these permissions grants visibility. */
  permissions: Permission[];
  icon?: AdminNavIcon;
};

export type AdminNavGroup = {
  kind: "group";
  id: string;
  label: string;
  icon: AdminNavIcon;
  children: AdminNavLink[];
};

export type AdminNavEntry = AdminNavLink | AdminNavGroup;

/** Flat link shape used by older callers / tests. */
export type AdminNavItem = {
  label: string;
  href: string;
  permission: Permission;
};

const p = getAdminPath;

export const ADMIN_NAV_TREE: AdminNavEntry[] = [
  {
    kind: "link",
    id: "dashboard",
    label: "Dashboard",
    href: p("/dashboard"),
    permissions: ["dashboard.view"],
    icon: "dashboard",
  },
  {
    kind: "group",
    id: "products",
    label: "Products",
    icon: "products",
    children: [
      {
        kind: "link",
        id: "products-all",
        label: "All Products",
        href: p("/catalog/products"),
        permissions: ["products.view"],
      },
      {
        kind: "link",
        id: "products-categories",
        label: "Categories",
        href: p("/catalog/categories"),
        permissions: ["categories.view"],
      },
    ],
  },
  {
    kind: "link",
    id: "orders",
    label: "Orders",
    href: p("/orders"),
    permissions: ["orders.view"],
    icon: "orders",
  },
  {
    kind: "link",
    id: "customers",
    label: "Customers",
    href: p("/customers"),
    permissions: ["customers.view"],
    icon: "customers",
  },
  {
    kind: "group",
    id: "content",
    label: "Content",
    icon: "content",
    children: [
      {
        kind: "link",
        id: "content-homepage",
        label: "Homepage",
        href: p("/content/homepage"),
        permissions: ["content.view", "cms.view"],
      },
      {
        kind: "link",
        id: "content-pages",
        label: "Pages",
        href: p("/content/pages"),
        permissions: ["content.view", "cms.view"],
      },
      {
        kind: "link",
        id: "content-banners",
        label: "Banners",
        href: p("/content/banners"),
        permissions: ["content.view", "cms.view"],
      },
      {
        kind: "link",
        id: "content-media",
        label: "Images & Files",
        href: p("/media"),
        permissions: ["media.view"],
      },
    ],
  },
  {
    kind: "group",
    id: "settings",
    label: "Store Settings",
    icon: "settings",
    children: [
      {
        kind: "link",
        id: "settings-hub",
        label: "Overview",
        href: p("/settings"),
        permissions: [
          "settings.view",
          "branding.view",
          "navigation.view",
          "seo.view",
          "theme.view",
          "shipping.view",
          "payments.view",
          "coupons.view",
        ],
      },
      {
        kind: "link",
        id: "settings-general",
        label: "Store Information",
        href: p("/settings/general"),
        permissions: ["settings.view"],
      },
      {
        kind: "link",
        id: "settings-branding",
        label: "Logo & Branding",
        href: p("/settings/branding"),
        permissions: ["branding.view"],
      },
      {
        kind: "link",
        id: "settings-appearance",
        label: "Appearance",
        href: p("/settings/theme"),
        permissions: ["theme.view"],
      },
      {
        kind: "link",
        id: "settings-navigation",
        label: "Menu & Navigation",
        href: p("/settings/navigation"),
        permissions: ["navigation.view"],
      },
      {
        kind: "link",
        id: "settings-shipping",
        label: "Shipping",
        href: p("/settings/shipping"),
        permissions: ["shipping.view"],
      },
      {
        kind: "link",
        id: "settings-payments",
        label: "Payments",
        href: p("/settings/payments"),
        permissions: ["payments.view"],
      },
      {
        kind: "link",
        id: "settings-coupons",
        label: "Coupons",
        href: p("/settings/coupons"),
        permissions: ["coupons.view"],
      },
      {
        kind: "link",
        id: "settings-seo",
        label: "Google & SEO",
        href: p("/settings/seo"),
        permissions: ["seo.view"],
      },
    ],
  },
];

function canSee(permissions: Set<Permission>, required: Permission[]): boolean {
  return required.some((permission) => permissions.has(permission));
}

/** Nested nav filtered by the signed-in user's permissions. */
export function getAdminNavTreeForPermissions(
  permissions: Set<Permission>,
): AdminNavEntry[] {
  const result: AdminNavEntry[] = [];

  for (const entry of ADMIN_NAV_TREE) {
    if (entry.kind === "link") {
      if (canSee(permissions, entry.permissions)) {
        result.push(entry);
      }
      continue;
    }

    const children = entry.children.filter((child) =>
      canSee(permissions, child.permissions),
    );
    if (children.length > 0) {
      result.push({ ...entry, children });
    }
  }

  return result;
}

/**
 * Flat list of visible links (for tests / compatibility).
 * Parent group labels are not included — only actionable destinations.
 */
export function getAdminNavForPermissions(
  permissions: Set<Permission>,
): AdminNavItem[] {
  const items: AdminNavItem[] = [];
  for (const entry of getAdminNavTreeForPermissions(permissions)) {
    if (entry.kind === "link") {
      items.push({
        label: entry.label,
        href: entry.href,
        permission: entry.permissions[0]!,
      });
      continue;
    }
    for (const child of entry.children) {
      items.push({
        label: child.label,
        href: child.href,
        permission: child.permissions[0]!,
      });
    }
  }
  return items;
}

/** Human-readable labels for breadcrumbs by path suffix. */
export const ADMIN_BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  customers: "Customers",
  media: "Images & Files",
  cms: "Content",
  content: "Content",
  homepage: "Homepage",
  pages: "Pages",
  banners: "Banners",
  catalog: "Products",
  products: "All Products",
  new: "Add Product",
  categories: "Categories",
  settings: "Store Settings",
  general: "Store Information",
  branding: "Logo & Branding",
  theme: "Appearance",
  header: "Header",
  footer: "Footer",
  navigation: "Menu & Navigation",
  shipping: "Shipping",
  payments: "Payments",
  coupons: "Coupons",
  seo: "Google & SEO",
};
