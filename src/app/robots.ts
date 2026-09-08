import type { MetadataRoute } from "next";
import { getAdminRouteSegment } from "@/config/admin-route";
import { resolveTrustedSiteUrl } from "@/lib/site-url";
import { buildRobotsDisallowPaths } from "@/features/seo/sitemap-rules";

/**
 * Dynamic robots.txt — not a security boundary.
 * Admin remains Auth + RBAC + RLS.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveTrustedSiteUrl();
  let adminSegment = "manage-store";
  try {
    adminSegment = getAdminRouteSegment();
  } catch {
    // Fall back to default if ADMIN_ROUTE misconfigured at build time
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
