import type { Metadata } from "next";
import { getPlatformConfig } from "@/config/site";
import type { SeoConfig } from "@/types";
import {
  absoluteUrl,
  isSafePublicAssetUrl,
  resolveTrustedSiteUrl,
} from "@/lib/site-url";
import type { ResolvedPageSeo } from "@/features/seo/resolve";

interface BuildMetadataOptions {
  title?: string;
  description?: string;
  ogImage?: string;
  canonicalPath?: string;
  /** Override OG type (product pages use "product"). */
  ogType?: "website" | "product" | "article";
  /** Force noindex/nofollow for private storefront surfaces. */
  noIndex?: boolean;
  noFollow?: boolean;
  seo?: SeoConfig;
}

/** Reusable metadata builder for App Router pages. */
export function buildPageMetadata(
  options: BuildMetadataOptions = {},
): Metadata {
  const config = options.seo ?? getPlatformConfig().seo;
  const siteUrl = resolveTrustedSiteUrl();
  const title = options.title ?? config.title;
  const description = options.description ?? config.description;
  const rawOg = options.ogImage ?? config.ogImage;
  const ogImage = isSafePublicAssetUrl(rawOg) ? rawOg : undefined;
  const canonical =
    options.canonicalPath != null
      ? absoluteUrl(options.canonicalPath, siteUrl)
      : config.canonicalUrl && isSafePublicAssetUrl(config.canonicalUrl)
        ? config.canonicalUrl
        : undefined;

  const index =
    options.noIndex === true
      ? false
      : (config.robotsIndex ?? true);
  const follow =
    options.noFollow === true
      ? false
      : (config.robotsFollow ?? true);

  const ogType = options.ogType ?? "website";

  return {
    title: config.titleTemplate
      ? { default: title, template: config.titleTemplate }
      : title,
    description: description || undefined,
    keywords: config.keywords?.length ? config.keywords : undefined,
    metadataBase: new URL(siteUrl),
    alternates: canonical ? { canonical } : undefined,
    robots: {
      index,
      follow,
    },
    openGraph: {
      title: options.title ?? config.ogTitle ?? title,
      description:
        (options.description ?? config.ogDescription ?? description) ||
        undefined,
      siteName: config.siteName ?? config.title,
      url: canonical,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: ogType === "product" ? "website" : ogType,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: options.title ?? config.ogTitle ?? title,
      description:
        (options.description ?? config.ogDescription ?? description) ||
        undefined,
      images: ogImage ? [ogImage] : undefined,
      site: config.twitterHandle,
    },
  };
}

/** Apply a resolved SEO object (from features/seo/resolve). */
export function metadataFromResolved(
  resolved: ResolvedPageSeo,
  seo: SeoConfig,
): Metadata {
  return buildPageMetadata({
    title: resolved.title,
    description: resolved.description,
    ogImage: resolved.ogImage,
    canonicalPath: resolved.canonicalPath,
    ogType: resolved.ogType,
    noIndex: !resolved.robotsIndex,
    noFollow: !resolved.robotsFollow,
    seo,
  });
}
