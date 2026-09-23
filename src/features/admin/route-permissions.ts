import { getAdminPath, getAdminRouteSegment } from "@/config/admin-route";
import type { Permission } from "@/features/auth/permissions";

type RouteRule = {
  /** Match after /{adminSlug} — e.g. "/orders" or "/settings/coupons" */
  prefix: string;
  /** Any one of these permissions allows access. */
  anyOf: Permission[];
};

/**
 * Coarse path → permission map for layout-level blocks.
 * Pages still call requirePermission for the exact capability.
 */
const ADMIN_ROUTE_RULES: RouteRule[] = [
  { prefix: "/dashboard", anyOf: ["dashboard.view"] },
  { prefix: "/reports", anyOf: ["dashboard.view"] },
  { prefix: "/catalog/categories", anyOf: ["categories.view"] },
  { prefix: "/catalog/sizes", anyOf: ["products.view"] },
  { prefix: "/catalog/products", anyOf: ["products.view"] },
  { prefix: "/catalog/inventory", anyOf: ["inventory.view"] },
  { prefix: "/catalog/reviews", anyOf: ["reviews.view"] },
  { prefix: "/products", anyOf: ["products.view"] },
  { prefix: "/orders", anyOf: ["orders.view"] },
  { prefix: "/customers", anyOf: ["customers.view"] },
  { prefix: "/error-logs", anyOf: ["error_logs.view"] },
  { prefix: "/platform-usage", anyOf: ["settings.view"] },
  { prefix: "/media", anyOf: ["media.view"] },
  { prefix: "/content", anyOf: ["content.view", "cms.view", "blog.view"] },
  { prefix: "/cms", anyOf: ["cms.view", "content.view"] },
  { prefix: "/team", anyOf: ["users.view", "audit.view"] },
  { prefix: "/settings/general", anyOf: ["settings.view"] },
  { prefix: "/settings/branding", anyOf: ["branding.view"] },
  { prefix: "/settings/theme", anyOf: ["theme.view"] },
  { prefix: "/settings/navigation", anyOf: ["navigation.view"] },
  { prefix: "/settings/seo", anyOf: ["seo.view"] },
  { prefix: "/settings/shipping", anyOf: ["shipping.view"] },
  { prefix: "/settings/payments", anyOf: ["payments.view"] },
  { prefix: "/settings/coupons", anyOf: ["coupons.view"] },
  { prefix: "/settings/header", anyOf: ["settings.view"] },
  { prefix: "/settings/footer", anyOf: ["settings.view"] },
  {
    prefix: "/settings",
    anyOf: [
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
];

/** Longest-prefix match wins. Returns null when no rule applies (allow). */
export function resolveAdminRoutePermissions(
  pathname: string,
): Permission[] | null {
  let adminSegment: string;
  try {
    adminSegment = getAdminRouteSegment();
  } catch {
    return null;
  }

  const base = `/${adminSegment}`;
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return null;

  const relative =
    pathname === base ? "/" : pathname.slice(base.length) || "/";

  // Public-ish admin auth pages
  if (
    relative === "/login" ||
    relative.startsWith("/login/") ||
    relative === "/unauthorized" ||
    relative.startsWith("/unauthorized/")
  ) {
    return null;
  }

  let best: RouteRule | null = null;
  for (const rule of ADMIN_ROUTE_RULES) {
    if (relative === rule.prefix || relative.startsWith(`${rule.prefix}/`)) {
      if (!best || rule.prefix.length > best.prefix.length) {
        best = rule;
      }
    }
  }
  return best?.anyOf ?? null;
}

export function canAccessAdminPath(
  pathname: string,
  permissions: Set<Permission>,
): boolean {
  const required = resolveAdminRoutePermissions(pathname);
  if (!required?.length) return true;
  return required.some((permission) => permissions.has(permission));
}

export function adminUnauthorizedPath(): string {
  return getAdminPath("/unauthorized");
}
