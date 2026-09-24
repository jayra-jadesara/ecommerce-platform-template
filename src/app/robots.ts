import type { MetadataRoute } from "next";
import { getAdminRouteSegment } from "@/config/admin-route";
import { getPlatformConfigAsync } from "@/config/site.server";
import { resolveSiteOrigin } from "@/lib/site-url";
import { buildRobotsDisallowPaths } from "@/features/seo/sitemap-rules";

/**
 * Dynamic robots.txt — driven by Google & SEO admin (robots_index).
 * Admin remains Auth + RBAC + RLS (not security).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const config = await getPlatformConfigAsync();
  const siteUrl = resolveSiteOrigin(config.seo.canonicalUrl);
  let adminSegment = "manage-store";
  try {
    adminSegment = getAdminRouteSegment();
  } catch {
    // Fall back to default if ADMIN_ROUTE misconfigured at build time
  }

  const allowIndex = config.seo.robotsIndex !== false;

  if (!allowIndex) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: `${siteUrl}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: buildRobotsDisallowPaths(adminSegment),
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
