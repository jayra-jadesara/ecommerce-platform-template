import { randomBytes } from "node:crypto";

const DEFAULT_ORDER_PREFIX = "ORD";

/**
 * Normalize admin-entered prefix: uppercase, A–Z / 0–9 / hyphen, no edge hyphens.
 */
export function normalizeOrderNumberPrefix(raw: string | null | undefined): string {
  const cleaned = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return cleaned || DEFAULT_ORDER_PREFIX;
}

/** Build a unique-looking order number: `{PREFIX}-{TIME36}-{HEX}`. */
export function buildStoreOrderNumber(prefix?: string | null): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `${normalizeOrderNumberPrefix(prefix)}-${stamp}-${rand}`;
}

export { DEFAULT_ORDER_PREFIX };
