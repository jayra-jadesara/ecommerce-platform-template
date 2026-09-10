export {
  resolveStoreHomepageSeo,
  resolveProductSeo,
  resolveCategorySeo,
  resolveCmsPageSeo,
  resolveProductsListingSeo,
  type ResolvedPageSeo,
} from "./resolve";

export {
  serializeJsonLd,
  buildProductJsonLd,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  schemaAvailability,
  type JsonLd,
  type ProductJsonLdInput,
} from "./json-ld";

export { JsonLdScript } from "./JsonLdScript";
export { GoogleSeoPreview } from "./components/GoogleSeoPreview";
export { AdminSeoFields } from "./components/AdminSeoFields";
export {
  buildSeoTitle,
  buildSeoDescription,
  normalizeSeoText,
  shouldKeepAutoSeo,
} from "./auto-seo";

/** Pure robots/sitemap helpers (no server-only DB access). */
export {
  buildRobotsDisallowPaths,
  shouldIncludeInSitemap,
} from "./sitemap-rules";
