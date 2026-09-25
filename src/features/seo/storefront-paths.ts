/**
 * Storefront URL catalog — paths/labels owned by Menu & Navigation.
 * Google & SEO mirrors them (read-only); sitemap enabled/priority stay in SEO settings.
 */

export type StorefrontPathDef = {
  id: string;
  path: string;
  label: string;
  /** Pretty-route CMS slug; empty if not a CMS page. */
  cmsSlug: string;
};

/** Admin form seed only — used when Menu & Navigation has no root links yet. */
export const DEFAULT_STOREFRONT_PATHS: StorefrontPathDef[] = [
  { id: "home", path: "/", label: "Home", cmsSlug: "" },
  { id: "products", path: "/products", label: "Products", cmsSlug: "" },
  { id: "blog", path: "/blog", label: "Blog", cmsSlug: "" },
  { id: "about", path: "/about", label: "About", cmsSlug: "about" },
  { id: "contact", path: "/contact", label: "Contact", cmsSlug: "contact" },
  { id: "career", path: "/career", label: "Career", cmsSlug: "career" },
  { id: "brochure", path: "/brochure", label: "Brochure", cmsSlug: "" },
  { id: "privacy", path: "/privacy", label: "Privacy", cmsSlug: "privacy" },
  { id: "terms", path: "/terms", label: "Terms", cmsSlug: "terms" },
  { id: "disclaimer", path: "/disclaimer", label: "Disclaimer", cmsSlug: "disclaimer" },
  { id: "cart", path: "/cart", label: "Cart", cmsSlug: "" },
];

export function normalizeStorefrontPath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
}

export type NavHrefRow = {
  id: string;
  location?: string | null;
  parent_id?: string | null;
  label?: string | null;
  href?: string | null;
  is_active?: boolean | null;
};

/**
 * Build the storefront path catalog from Menu & Navigation root links.
 * Prefer header label over footer when the same path appears twice.
 */
export function buildStorefrontPathsFromNavRows(
  rows: NavHrefRow[],
): StorefrontPathDef[] {
  const byPath = new Map<string, StorefrontPathDef & { rank: number }>();

  for (const row of rows) {
    if (row.parent_id) continue;
    const href = String(row.href ?? "").trim();
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const path = normalizeStorefrontPath(href);
    const label = String(row.label ?? "").trim() || path;
    const rank =
      (row.location === "header" ? 0 : 1) + (row.is_active === false ? 10 : 0);
    const existing = byPath.get(path);
    if (existing && existing.rank <= rank) continue;
    byPath.set(path, {
      id: String(row.id),
      path,
      label,
      cmsSlug: cmsSlugFromPath(path),
      rank,
    });
  }

  return [...byPath.values()]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(({ rank: _rank, ...rest }) => rest);
}

export function parseStorefrontPaths(raw: unknown): StorefrontPathDef[] {
  if (!Array.isArray(raw)) return [];
  const out: StorefrontPathDef[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry as Record<string, unknown>;
    const path = normalizeStorefrontPath(
      typeof row.path === "string" ? row.path : "",
    );
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : `path-${out.length}`;
    const label =
      typeof row.label === "string" && row.label.trim()
        ? row.label.trim()
        : path;
    const cmsSlug =
      typeof row.cmsSlug === "string"
        ? row.cmsSlug.trim().replace(/^\/+/, "")
        : "";
    out.push({ id, path, label, cmsSlug });
  }
  return out;
}

export function storefrontPathOptions(
  paths: StorefrontPathDef[],
): Array<{ value: string; label: string }> {
  return paths.map((p) => ({
    value: p.path,
    label: p.label ? `${p.label} (${p.path})` : p.path,
  }));
}

export function findStorefrontPath(
  paths: StorefrontPathDef[],
  path: string,
): StorefrontPathDef | undefined {
  const normalized = normalizeStorefrontPath(path);
  return paths.find((p) => p.path === normalized);
}

/**
 * Content page key derived from path — used so pretty CMS routes
 * (e.g. /about) are not listed twice in the sitemap.
 */
export function cmsSlugFromPath(path: string): string {
  const p = normalizeStorefrontPath(path);
  if (
    p === "/" ||
    p === "/products" ||
    p === "/blog" ||
    p === "/brochure" ||
    p === "/cart" ||
    p === "/categories"
  ) {
    return "";
  }
  const match = /^\/([a-z0-9-]+)$/i.exec(p);
  return match?.[1]?.toLowerCase() ?? "";
}
