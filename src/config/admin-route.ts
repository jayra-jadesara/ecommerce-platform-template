/**
 * Configurable admin URL segment.
 * This is routing convenience only — not a security boundary.
 * Authorization uses Supabase Auth + admin_users + roles + RLS.
 */
export function getAdminRouteSegment(): string {
  const raw = process.env.ADMIN_ROUTE?.trim() || "manage-store";
  const cleaned = raw.replace(/^\/+|\/+$/g, "").toLowerCase();

  if (!cleaned || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleaned)) {
    throw new Error(
      "ADMIN_ROUTE must be a lowercase slug (e.g. manage-store). Do not use spaces or special characters.",
    );
  }

  // Avoid colliding with reserved app routes
  const reserved = new Set([
    "login",
    "register",
    "account",
    "api",
    "auth",
    "products",
    "categories",
    "pages",
    "about",
    "contact",
    "privacy",
    "terms",
  ]);
  if (reserved.has(cleaned)) {
    throw new Error(`ADMIN_ROUTE "${cleaned}" conflicts with a reserved path.`);
  }

  return cleaned;
}

/** Absolute admin path helper, e.g. getAdminPath('/dashboard') → /manage-store/dashboard */
export function getAdminPath(subPath = ""): string {
  const base = `/${getAdminRouteSegment()}`;
  if (!subPath || subPath === "/") return base;
  const normalized = subPath.startsWith("/") ? subPath : `/${subPath}`;
  return `${base}${normalized}`;
}
