import { getAdminPath } from "@/config/admin-route";
import type { Permission } from "@/features/auth/permissions";

export type AdminNavIcon =
  | "dashboard"
  | "products"
  | "orders"
  | "customers"
  | "content"
  | "settings"
  | "categories"
  | "homepage"
  | "pages"
  | "banners"
  | "blog"
  | "media";

export type AdminNavSection =
  | "main"
  | "catalog"
  | "sales"
  | "content"
  | "store";

export type AdminNavLink = {
  kind: "link";
  id: string;
  label: string;
  href: string;
  /** Any of these permissions grants visibility. */
  permissions: Permission[];
  icon?: AdminNavIcon;
  section?: AdminNavSection;
};

export type AdminNavGroup = {
  kind: "group";
  id: string;
  label: string;
  icon: AdminNavIcon;
  section?: AdminNavSection;
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

/**
 * Business-friendly navigation.
 * Flat links with section labels for the redesigned sidebar.
 * Groups preserved where nested destinations still exist for permissions tests.
 */
export const ADMIN_NAV_TREE: AdminNavEntry[] = [
  {
    kind: "link",
    id: "dashboard",
    label: "Dashboard",
    href: p("/dashboard"),
    permissions: ["dashboard.view"],
    icon: "dashboard",
    section: "main",
  },
  {
    kind: "group",
    id: "products",
    label: "Products",
    icon: "products",
    section: "catalog",
    children: [
      {
        kind: "link",
        id: "products-all",
        label: "All Products",
        href: p("/catalog/products"),
        permissions: ["products.view"],
        icon: "products",
        section: "catalog",
      },
      {
        kind: "link",
        id: "products-categories",
        label: "Categories",
        href: p("/catalog/categories"),
        permissions: ["categories.view"],
        icon: "categories",
        section: "catalog",
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
    section: "sales",
  },
  {
    kind: "link",
    id: "error-logs",
    label: "Error Logs",
    href: p("/error-logs"),
    permissions: ["error_logs.view"],
    icon: "orders",
    section: "sales",
  },
  {
    kind: "link",
    id: "customers",
    label: "Customers",
    href: p("/customers"),
    permissions: ["customers.view"],
    icon: "customers",
    section: "sales",
  },
  {
    kind: "group",
    id: "content",
    label: "Content",
    icon: "content",
    section: "content",
    children: [
      {
        kind: "link",
        id: "content-homepage",
        label: "Homepage",
        href: p("/content/homepage"),
        permissions: ["content.view", "cms.view"],
        icon: "homepage",
        section: "content",
      },
      {
        kind: "link",
        id: "content-about",
        label: "About",
        href: p("/content/about"),
        permissions: ["content.view", "cms.view"],
        icon: "pages",
        section: "content",
      },
      {
        kind: "link",
        id: "content-pages",
        label: "Pages",
        href: p("/content/pages"),
        permissions: ["content.view", "cms.view"],
        icon: "pages",
        section: "content",
      },
      {
        kind: "link",
        id: "content-banners",
        label: "Banners",
        href: p("/content/banners"),
        permissions: ["content.view", "cms.view"],
        icon: "banners",
        section: "content",
      },
      {
        kind: "link",
        id: "content-blog",
        label: "Blog",
        href: p("/content/blog"),
        permissions: ["blog.view"],
        icon: "blog",
        section: "content",
      },
      {
        kind: "link",
        id: "content-media",
        label: "Images & Files",
        href: p("/media"),
        permissions: ["media.view"],
        icon: "media",
        section: "content",
      },
    ],
  },
  {
    kind: "group",
    id: "settings",
    label: "Store Settings",
    icon: "settings",
    section: "store",
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
        icon: "settings",
        section: "store",
      },
      {
        kind: "link",
        id: "settings-general",
        label: "Store Information",
        href: p("/settings/general"),
        permissions: ["settings.view"],
        section: "store",
      },
      {
        kind: "link",
        id: "settings-branding",
        label: "Logo & Branding",
        href: p("/settings/branding"),
        permissions: ["branding.view"],
        section: "store",
      },
      {
        kind: "link",
        id: "settings-appearance",
        label: "Appearance",
        href: p("/settings/theme"),
        permissions: ["theme.view"],
        section: "store",
      },
      {
        kind: "link",
        id: "settings-navigation",
        label: "Menu & Navigation",
        href: p("/settings/navigation"),
        permissions: ["navigation.view"],
        section: "store",
      },
      {
        kind: "link",
        id: "settings-shipping",
        label: "Shipping",
        href: p("/settings/shipping"),
        permissions: ["shipping.view"],
        section: "store",
      },
      {
        kind: "link",
        id: "settings-payments",
        label: "Payments",
        href: p("/settings/payments"),
        permissions: ["payments.view"],
        section: "store",
      },
      {
        kind: "link",
        id: "settings-coupons",
        label: "Coupons",
        href: p("/settings/coupons"),
        permissions: ["coupons.view"],
        section: "store",
      },
      {
        kind: "link",
        id: "settings-seo",
        label: "Google & SEO",
        href: p("/settings/seo"),
        permissions: ["seo.view"],
        section: "store",
      },
    ],
  },
];

export const ADMIN_NAV_SECTION_LABELS: Record<AdminNavSection, string> = {
  main: "Main",
  catalog: "Catalog",
  sales: "Sales",
  content: "Content",
  store: "Store",
};

/** Sidebar prefers a compact flat list: Products/Categories + Content children + Store Settings hub only. */
export const ADMIN_SIDEBAR_PRIMARY_LINK_IDS = new Set([
  "dashboard",
  "products-all",
  "products-categories",
  "orders",
  "error-logs",
  "customers",
  "content-homepage",
  "content-about",
  "content-pages",
  "content-banners",
  "content-blog",
  "content-media",
  "settings-hub",
]);

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
    if (children.length === 0) continue;
    result.push({ ...entry, children });
  }

  return result;
}

/** Flat links for permission-filtered navigation (includes nested children). */
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

/** Flatten tree into sidebar-ready links with section labels. */
export function getAdminSidebarLinks(
  tree: AdminNavEntry[],
): Array<AdminNavLink & { section: AdminNavSection }> {
  const links: Array<AdminNavLink & { section: AdminNavSection }> = [];
  for (const entry of tree) {
    if (entry.kind === "link") {
      if (ADMIN_SIDEBAR_PRIMARY_LINK_IDS.has(entry.id)) {
        links.push({
          ...entry,
          section: entry.section ?? "main",
        });
      }
      continue;
    }
    for (const child of entry.children) {
      if (ADMIN_SIDEBAR_PRIMARY_LINK_IDS.has(child.id)) {
        links.push({
          ...child,
          section: child.section ?? entry.section ?? "main",
        });
      }
    }
  }
  return links;
}

export const ADMIN_BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  catalog: "Catalog",
  products: "Products",
  categories: "Categories",
  orders: "Orders",
  customers: "Customers",
  "error-logs": "Error Logs",
  content: "Content",
  homepage: "Homepage",
  about: "About",
  pages: "Pages",
  banners: "Banners",
  blog: "Blog",
  media: "Images & Files",
  settings: "Store Settings",
  general: "Store Information",
  branding: "Logo & Branding",
  theme: "Appearance",
  navigation: "Menu & Navigation",
  shipping: "Shipping",
  payments: "Payments",
  coupons: "Coupons",
  seo: "Google & SEO",
  header: "Header",
  footer: "Footer",
  new: "Add Product",
};
