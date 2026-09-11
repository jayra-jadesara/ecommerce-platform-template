/** Client-only recently viewed product slugs (storefront PDP). */

const STORAGE_KEY = "sf-recently-viewed-slugs";
const MAX_ITEMS = 10;

function readSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === "string" && s.length > 0 && s.length < 200)
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeSlugs(slugs: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs.slice(0, MAX_ITEMS)));
  } catch {
    // ignore quota / private mode
  }
}

/** Call on product detail mount — newest first, no duplicates. */
export function recordRecentlyViewedSlug(slug: string) {
  const trimmed = slug.trim();
  if (!trimmed) return;
  const next = [trimmed, ...readSlugs().filter((s) => s !== trimmed)].slice(
    0,
    MAX_ITEMS,
  );
  writeSlugs(next);
}

export function getRecentlyViewedSlugs(excludeSlug?: string): string[] {
  const slugs = readSlugs();
  if (!excludeSlug) return slugs;
  return slugs.filter((s) => s !== excludeSlug);
}
