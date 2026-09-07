import type { Metadata } from "next";
import { getPlatformConfig, getSiteUrl } from "@/config/site";
import type { SeoConfig } from "@/types";

interface BuildMetadataOptions {
  title?: string;
  description?: string;
  ogImage?: string;
  canonicalPath?: string;
  seo?: SeoConfig;
}

/** Reusable metadata builder for App Router pages. */
export function buildPageMetadata(
  options: BuildMetadataOptions = {},
): Metadata {
  const config = options.seo ?? getPlatformConfig().seo;
  const siteUrl = getSiteUrl();
  const title = options.title ?? config.title;
  const description = options.description ?? config.description;
  const ogImage = options.ogImage ?? config.ogImage;
  const canonical =
    options.canonicalPath != null
      ? `${siteUrl}${options.canonicalPath}`
      : config.canonicalUrl;

  return {
    title: config.titleTemplate
      ? { default: title, template: config.titleTemplate }
      : title,
    description,
    keywords: config.keywords?.length ? config.keywords : undefined,
    metadataBase: new URL(siteUrl),
    alternates: canonical ? { canonical } : undefined,
    robots: {
      index: config.robotsIndex ?? true,
      follow: config.robotsFollow ?? true,
    },
    openGraph: {
      title: options.title ?? config.ogTitle ?? title,
      description: options.description ?? config.ogDescription ?? description,
      siteName: config.siteName ?? config.title,
      url: canonical,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: "website",
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: options.title ?? config.ogTitle ?? title,
      description: options.description ?? config.ogDescription ?? description,
      images: ogImage ? [ogImage] : undefined,
      site: config.twitterHandle,
    },
  };
}
