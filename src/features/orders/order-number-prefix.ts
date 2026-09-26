/** Default when store name is empty / unusable. */
export const DEFAULT_ORDER_PREFIX = "ORD";

/**
 * Normalize admin-entered prefix: uppercase, A–Z / 0–9 / hyphen, no edge hyphens.
 */
export function normalizeOrderNumberPrefix(
  raw: string | null | undefined,
): string {
  const cleaned = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return cleaned || DEFAULT_ORDER_PREFIX;
}

/**
 * Suggest a prefix from the store display name, e.g. "Sonet" → "SONET-ORD".
 * Safe for client + server.
 */
export function suggestOrderNumberPrefixFromStoreName(
  storeName: string | null | undefined,
): string {
  const slug = String(storeName ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 12);
  if (!slug) return DEFAULT_ORDER_PREFIX;
  return normalizeOrderNumberPrefix(`${slug}-ORD`);
}

/** Stable preview shown under the prefix field (not a real order id). */
export function exampleOrderNumber(prefix: string | null | undefined): string {
  return `${normalizeOrderNumberPrefix(prefix)}-MU9GO741-A1B2C3`;
}
