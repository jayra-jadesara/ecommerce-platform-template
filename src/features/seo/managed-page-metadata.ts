import "server-only";

import type { Metadata } from "next";
import { getPlatformConfigAsync } from "@/config/site.server";
import { metadataFromResolved } from "@/lib/metadata";
import { resolveManagedPageSeo } from "@/features/seo/resolve";
import type { SeoManagedPageKey } from "@/types";

/** Metadata for About / Contact / Career / Brochure / legal — titles from Google & SEO DB. */
export async function metadataForManagedStorePage(input: {
  pageKey: SeoManagedPageKey;
  path: string;
  fallbackTitle: string;
  fallbackDescription?: string;
}): Promise<Metadata> {
  const config = await getPlatformConfigAsync();
  const resolved = resolveManagedPageSeo({
    seo: config.seo,
    pageKey: input.pageKey,
    path: input.path,
    fallbackTitle: input.fallbackTitle,
    fallbackDescription: input.fallbackDescription,
  });
  return metadataFromResolved(resolved, config.seo);
}
