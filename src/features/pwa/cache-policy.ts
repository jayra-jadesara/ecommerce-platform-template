/**
 * Service-worker cache policy (shared with tests).
 * Never cache private / personalized / payment responses.
 */

export const PWA_CACHE_VERSION = "v1";

export const PWA_STATIC_CACHE = `storefront-static-${PWA_CACHE_VERSION}`;
export const PWA_OFFLINE_CACHE = `storefront-offline-${PWA_CACHE_VERSION}`;

export const PRIVATE_PATH_PREFIXES = [
  "/account",
  "/cart",
  "/checkout",
  "/payment",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/api/",
] as const;

export function normalizeAdminSegment(raw: string | undefined | null): string {
  const cleaned = (raw?.trim() || "manage-store")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
  return cleaned || "manage-store";
}

export function isPrivateCachePath(
  pathname: string,
  adminSegment?: string | null,
): boolean {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const admin = `/${normalizeAdminSegment(adminSegment)}`;
  if (path === admin || path.startsWith(`${admin}/`)) return true;

  for (const prefix of PRIVATE_PATH_PREFIXES) {
    if (prefix.endsWith("/")) {
      if (path.startsWith(prefix)) return true;
    } else if (path === prefix || path.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

/** Only allow caching of Next static assets and the offline page. */
export function isCacheableStaticAsset(pathname: string): boolean {
  if (pathname.startsWith("/_next/static/")) return true;
  if (pathname === "/offline") return true;
  if (pathname.startsWith("/manifest")) return true;
  if (/\.(?:ico|png|jpg|jpeg|webp|svg|woff2?)$/i.test(pathname)) {
    return !isPrivateCachePath(pathname);
  }
  return false;
}

export function shouldNetworkOnly(
  pathname: string,
  adminSegment?: string | null,
): boolean {
  return isPrivateCachePath(pathname, adminSegment);
}
