import { AdminReviewsManager } from "@/features/reviews/components/AdminReviewsManager";
import { AdminReviewsSettingsToggles } from "@/features/reviews/components/AdminReviewsEnabledToggle";
import {
  getReviewsStoreSettings,
  listAdminProductReviews,
} from "@/features/reviews/service";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { productReviewStatusSchema } from "@/features/reviews/schemas";
import type { ProductReviewStatus } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    status?: string;
  }>;
}) {
  const admin = await requirePermission("reviews.view");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const rawPageSize = Number(params.pageSize) || 10;
  const pageSize = rawPageSize === 25 ? 25 : 10;

  const statusParsed = productReviewStatusSchema.safeParse(params.status);
  const status: ProductReviewStatus | "all" = statusParsed.success
    ? statusParsed.data
    : "all";

  const [result, settings] = await Promise.all([
    listAdminProductReviews({
      status,
      search: params.q ?? "",
      page,
      pageSize,
    }),
    getReviewsStoreSettings(),
  ]);

  return (
    <div className="w-full min-w-0 space-y-3">
      <AdminPageHeader
        title="Reviews"
        description="Moderate customer product reviews before they appear on the store."
        breadcrumbs={[
          { label: "Products", href: getAdminPath("/catalog/products") },
          { label: "Reviews" },
        ]}
        actions={
          <AdminReviewsSettingsToggles
            enabled={settings.enabled}
            autoApprove={settings.autoApprove}
            previewLimit={settings.previewLimit}
            canUpdate={hasPermission(admin, "reviews.moderate")}
          />
        }
      />
      <AdminReviewsManager
        initialItems={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        initialStatus={status}
        initialSearch={params.q ?? ""}
        canModerate={hasPermission(admin, "reviews.moderate")}
        adminBasePath={getAdminPath("")}
      />
    </div>
  );
}
