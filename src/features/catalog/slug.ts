/**
 * URL-safe slug helpers for catalog entities.
 * Matches DB constraints: ^[a-z0-9]+(?:-[a-z0-9]+)*$
 */

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function ensureUniqueSlugCandidate(
  base: string,
  existing: Set<string>,
  exclude?: string,
): string {
  const normalized = slugify(base) || "item";
  if (!existing.has(normalized) || normalized === exclude) return normalized;
  let i = 2;
  while (existing.has(`${normalized}-${i}`)) i += 1;
  return `${normalized}-${i}`;
}
