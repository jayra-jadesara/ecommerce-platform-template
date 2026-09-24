/**
 * Configurable admin URL segment.
 * This is routing convenience only — not a security boundary.
 * Authorization uses Supabase Auth + admin_users + roles + RLS.
 */

const STAFF_VIEW_PATH_RE = /\/as\/[^/]+/;

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
    "career",
    "privacy",
    "terms",
    "disclaimer",
  ]);
  if (reserved.has(cleaned)) {
    throw new Error(`ADMIN_ROUTE "${cleaned}" conflicts with a reserved path.`);
  }

  return cleaned;
}

/** Strip `/as/{token}` from an admin pathname for matching / titles. */
export function stripStaffViewFromPathname(pathname: string): string {
  let segment: string;
  try {
    segment = getAdminRouteSegment();
  } catch {
    return pathname;
  }
  const re = new RegExp(`^(/${segment})/as/[^/]+`);
  const stripped = pathname.replace(re, "$1");
  return stripped || `/${segment}`;
}

/** Read staff-view token from a browser pathname, if present. */
export function staffViewTokenFromPathname(pathname: string): string | null {
  let segment: string;
  try {
    segment = getAdminRouteSegment();
  } catch {
    return null;
  }
  const re = new RegExp(`^/${segment}/as/([^/]+)`);
  const match = pathname.match(re);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function clientStaffViewToken(): string | null {
  if (typeof window === "undefined") return null;
  return staffViewTokenFromPathname(window.location.pathname);
}

/**
 * Absolute admin path helper.
 * e.g. getAdminPath('/dashboard') → /manage-store/dashboard
 *
 * When a staff-view token is active (URL `/as/{token}/…` or explicit option),
 * paths stay under that prefix so only that tab keeps staff RBAC.
 * Pass `{ staffViewToken: null }` to force a Super Admin (non-staff-view) URL.
 */
export function getAdminPath(
  subPath = "",
  options?: { staffViewToken?: string | null },
): string {
  const segment = getAdminRouteSegment();
  let token: string | null | undefined = options?.staffViewToken;
  if (token === undefined) {
    token = clientStaffViewToken();
  }

  const staffPrefix =
    token && token.length > 0 ? `/as/${encodeURIComponent(token)}` : "";
  const base = `/${segment}${staffPrefix}`;

  if (!subPath || subPath === "/") return base || `/${segment}`;
  // If caller already passed a full admin path, normalize staff-view prefix.
  if (subPath.startsWith(`/${segment}`)) {
    const relative = stripStaffViewFromPathname(subPath).slice(
      `/${segment}`.length,
    );
    const normalized = relative.startsWith("/") ? relative : `/${relative}`;
    if (!relative || relative === "/") return base;
    return `${base}${normalized}`;
  }
  const normalized = subPath.startsWith("/") ? subPath : `/${subPath}`;
  // Ignore accidental /as/ in subPath
  if (STAFF_VIEW_PATH_RE.test(normalized) && !normalized.startsWith("/as/")) {
    return `${base}${normalized}`;
  }
  return `${base}${normalized}`;
}
