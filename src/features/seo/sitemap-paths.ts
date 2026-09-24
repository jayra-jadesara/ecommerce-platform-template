/**
 * Sitemap rows stored in schema_settings.sitemapPaths.
 * Paths must come from schema_settings.storefrontPaths (admin catalog).
 */

import {
  findStorefrontPath,
  normalizeStorefrontPath,
  type StorefrontPathDef,
  DEFAULT_STOREFRONT_PATHS,
} from "@/features/seo/storefront-paths";

export type SeoSitemapPath = {
  id: string;
  path: string;
  label: string;
  priority: number;
  enabled: boolean;
  cmsSlug: string;
};

/** Form seed: catalog paths with default priorities (written on first Save). */
export function buildDefaultSitemapPaths(
  catalog: StorefrontPathDef[] = DEFAULT_STOREFRONT_PATHS,
): SeoSitemapPath[] {
  const priorityByPath: Record<string, number> = {
    "/": 1,
    "/products": 0.9,
    "/blog": 0.8,
    "/about": 0.7,
    "/contact": 0.7,
    "/career": 0.6,
    "/privacy": 0.4,
    "/terms": 0.4,
    "/disclaimer": 0.4,
  };
  return catalog
    .filter((p) => p.path !== "/cart")
    .map((p) => ({
      id: `sm-${p.id}`,
      path: p.path,
      label: p.label,
      cmsSlug: p.cmsSlug,
      priority: priorityByPath[p.path] ?? 0.5,
      enabled: true,
    }));
}

/** @deprecated Use buildDefaultSitemapPaths — kept for Reset button. */
export const DEFAULT_SITEMAP_PATHS = buildDefaultSitemapPaths();

export function normalizeSitemapPath(raw: string): string {
  return normalizeStorefrontPath(raw);
}

export function parseSitemapPaths(raw: unknown): SeoSitemapPath[] {
  if (!Array.isArray(raw)) return [];
  const out: SeoSitemapPath[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry as Record<string, unknown>;
    const path = normalizeSitemapPath(
      typeof row.path === "string" ? row.path : "",
    );
    if (!path) continue;
    const priority =
      typeof row.priority === "number" && Number.isFinite(row.priority)
        ? Math.min(1, Math.max(0, row.priority))
        : 0.5;
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : `path-${out.length}-${path}`;
    const label =
      typeof row.label === "string" && row.label.trim()
        ? row.label.trim()
        : path;
    const cmsSlug =
      typeof row.cmsSlug === "string"
        ? row.cmsSlug.trim().replace(/^\/+/, "")
        : "";
    out.push({
      id,
      path,
      label,
      priority,
      enabled: row.enabled !== false,
      cmsSlug,
    });
  }
  return out;
}

/** Sync label/cmsSlug from catalog when path is known. */
export function hydrateSitemapFromCatalog(
  rows: SeoSitemapPath[],
  catalog: StorefrontPathDef[],
): SeoSitemapPath[] {
  return rows.map((row) => {
    const match = findStorefrontPath(catalog, row.path);
    if (!match) return row;
    return {
      ...row,
      path: match.path,
      label: match.label,
      cmsSlug: match.cmsSlug,
    };
  });
}

export function enabledSitemapPaths(paths: SeoSitemapPath[]): SeoSitemapPath[] {
  return paths.filter((p) => p.enabled && p.path);
}

export function prettyRouteCmsSlugs(paths: SeoSitemapPath[]): Set<string> {
  const set = new Set<string>();
  for (const p of paths) {
    if (!p.enabled) continue;
    const slug = p.cmsSlug.trim();
    if (slug) set.add(slug);
  }
  return set;
}
