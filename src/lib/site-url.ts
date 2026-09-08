/**
 * Trusted absolute site URL for canonicals, sitemap, and robots.
 * Never derive canonicals from request Host headers.
 */

const UNSAFE = /^(javascript|data|vbscript|file):/i;

export function validateSiteUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim().replace(/\/$/, "");
  if (UNSAFE.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname) return null;
    // Reject credentials in URL
    if (url.username || url.password) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/**
 * Returns configured NEXT_PUBLIC_SITE_URL when valid, else localhost for local dev.
 */
export function resolveTrustedSiteUrl(
  envValue: string | null | undefined = process.env.NEXT_PUBLIC_SITE_URL,
): string {
  return validateSiteUrl(envValue) ?? "http://localhost:3000";
}

/** Join site origin + path into an absolute URL (path must start with /). */
export function absoluteUrl(path: string, siteUrl?: string): string {
  const base = siteUrl ?? resolveTrustedSiteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

/** Reject unsafe image/OG URL candidates (remote javascript/data, etc.). */
export function isSafePublicAssetUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const trimmed = value.trim();
  if (UNSAFE.test(trimmed)) return false;
  if (trimmed.startsWith("/")) {
    return !trimmed.startsWith("//") && !trimmed.includes("\\");
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
