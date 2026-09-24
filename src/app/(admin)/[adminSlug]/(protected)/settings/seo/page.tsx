import { SeoSettingsForm } from "@/features/admin/settings/components/SeoSettingsForm";
import { loadSeoSettingsForm } from "@/features/admin/settings/load-forms";
import { getImageUploadLimits } from "@/features/media/upload-limits.server";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminSeoSettingsPage() {
  const admin = await requirePermission("seo.view");
  const [{ values, storeDisplayName, sitemapUrl, missingProductSeoCount, ogImageUrl, pageSources }, limits] =
    await Promise.all([loadSeoSettingsForm(), getImageUploadLimits()]);
  const canUpdate = hasPermission(admin, "seo.update");

  const robotsUrl = sitemapUrl
    ? sitemapUrl.replace(/\/sitemap\.xml$/i, "/robots.txt")
    : "/robots.txt";

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Google & SEO"
        description="Control how your store appears in Google — titles, sitemap, and Search Console — in one place."
        breadcrumbs={[
          { label: "Store Settings", href: getAdminPath("/settings") },
          { label: "Google & SEO" },
        ]}
      />
      <SeoSettingsForm
        initialValues={values}
        canUpdate={canUpdate}
        storeDisplayName={storeDisplayName}
        sitemapUrl={sitemapUrl}
        robotsUrl={robotsUrl}
        missingProductSeoCount={missingProductSeoCount}
        productsAdminHref={getAdminPath("/catalog/products")}
        pageSources={pageSources}
        ogImageUrl={ogImageUrl}
        adminImageMaxMb={limits.adminImageMaxMb}
      />
    </div>
  );
}
