export {
  resolveStoreHomepageSeo,
  resolveProductSeo,
  resolveCategorySeo,
  resolveCmsPageSeo,
  resolveProductsListingSeo,
  resolveBlogListingSeo,
  resolveBlogPostSeo,
  type ResolvedPageSeo,
} from "./resolve";

export {
  serializeJsonLd,
  buildProductJsonLd,
  buildBlogPostingJsonLd,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  schemaAvailability,
  type JsonLd,
  type ProductJsonLdInput,
  type BlogPostingJsonLdInput,
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
