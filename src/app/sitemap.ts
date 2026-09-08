import type { MetadataRoute } from "next";
import { collectSitemapEntries } from "@/features/seo/sitemap-data";

/** Dynamic public sitemap — batched collection for large catalogs. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await collectSitemapEntries();
  return entries.map((entry) => ({
    url: entry.url,
    lastModified: entry.lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
