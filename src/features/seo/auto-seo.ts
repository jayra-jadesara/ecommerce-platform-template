/**
 * Shared helpers for auto-filling Google / SEO text fields in admin forms.
 */

export function normalizeSeoText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Search-result title (~60 chars). */
export function buildSeoTitle(
  source: string | null | undefined,
  maxLength = 60,
): string {
  const text = normalizeSeoText(source);
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd();
}

/** Meta description (~155 chars), prefers word boundary. */
export function buildSeoDescription(
  source: string | null | undefined,
  maxLength = 155,
): string {
  const text = normalizeSeoText(source);
  if (!text) return "";
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > 48 ? sliced.slice(0, lastSpace) : sliced).trimEnd();
}

/**
 * True when the current SEO field still matches what auto-fill would produce
 * (or is empty) — safe to keep syncing from the source field.
 */
export function shouldKeepAutoSeo(
  current: string | null | undefined,
  autoValue: string,
): boolean {
  const cur = normalizeSeoText(current);
  if (!cur) return true;
  return cur === normalizeSeoText(autoValue);
}
