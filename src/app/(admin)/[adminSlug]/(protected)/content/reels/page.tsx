import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { ReelsManager } from "@/features/reels/components/ReelsManager";
import {
  getReelsShowcaseSettings,
  listAdminReels,
} from "@/features/reels/reels-service";
import { listStorefrontProducts } from "@/features/catalog/storefront";
import { getImageUploadLimits } from "@/features/media/upload-limits.server";

export const dynamic = "force-dynamic";

export default async function AdminContentReelsPage() {
  const admin = await requirePermission("content.view");
  const [reels, productsResult, limits, showcaseSettings] = await Promise.all([
    listAdminReels(),
    listStorefrontProducts({
      pageSize: 100,
      sort: "name",
      page: 1,
    }),
    getImageUploadLimits(),
    getReelsShowcaseSettings(),
  ]);

  const productOptions = productsResult.items.map((p) => ({
    id: p.id,
    label: p.categoryName ? `${p.name} · ${p.categoryName}` : p.name,
  }));

  return (
    <div className="space-y-4 pb-16">
      <AdminPageHeader
        title="Reels"
        description="Hosted vertical videos for homepage and product pages."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "Reels" },
        ]}
      />
      <ReelsManager
        initialReels={reels}
        productOptions={productOptions}
        productCtaLabel={showcaseSettings.productCtaLabel}
        showcaseLimit={showcaseSettings.showcaseLimit}
        autoplayMuted={showcaseSettings.autoplayMuted}
        productPageHeading={showcaseSettings.productPageHeading}
        visibleSlides={showcaseSettings.visibleSlides}
        adminReelVideoMaxMb={limits.adminReelVideoMaxMb}
        canCreate={hasPermission(admin, "content.create")}
        canUpdate={hasPermission(admin, "content.update")}
        canDelete={hasPermission(admin, "content.delete")}
      />
    </div>
  );
}
