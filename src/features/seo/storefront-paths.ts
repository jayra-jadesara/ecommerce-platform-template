/**
 * Storefront URL catalog — single source for admin dropdowns + sitemap.
 * Stored in store_seo_settings.schema_settings.storefrontPaths (DB).
 * Form seed defaults are written on first Save; runtime always reads from DB.
 */

export type StorefrontPathDef = {
  id: string;
  path: string;
  label: string;
  /** Pretty-route CMS slug; empty if not a CMS page. */
  cmsSlug: string;
};

/** Admin form seed only — not used by storefront/sitemap at runtime. */
export const DEFAULT_STOREFRONT_PATHS: StorefrontPathDef[] = [
  { id: "home", path: "/", label: "Home", cmsSlug: "" },
  { id: "products", path: "/products", label: "Products", cmsSlug: "" },
  { id: "blog", path: "/blog", label: "Blog", cmsSlug: "" },
  { id: "about", path: "/about", label: "About", cmsSlug: "about" },
  { id: "contact", path: "/contact", label: "Contact", cmsSlug: "contact" },
  { id: "career", path: "/career", label: "Career", cmsSlug: "career" },
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
 * Content page key derived from path — used so /pages/{slug} is not listed twice.
 * Home, products, blog, and cart are not CMS pretty-routes.
 */
export function cmsSlugFromPath(path: string): string {
  const p = normalizeStorefrontPath(path);
  if (
    p === "/" ||
    p === "/products" ||
    p === "/blog" ||
    p === "/cart" ||
    p === "/categories"
  ) {
    return "";
  }
  const match = /^\/([a-z0-9-]+)$/i.exec(p);
  return match?.[1]?.toLowerCase() ?? "";
}
