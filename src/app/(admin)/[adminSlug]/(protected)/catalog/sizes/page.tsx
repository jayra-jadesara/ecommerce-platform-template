import { SizeOptionsManager } from "@/features/catalog/components/SizeOptionsManager";
import { AdminProductPageSettings } from "@/features/catalog/components/AdminProductPageSettings";
import { listAdminSizeOptions } from "@/features/catalog/size-options-service";
import { getProductPageSettings } from "@/features/catalog/product-page-settings-service";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminSettingsTabs } from "@/features/admin/ui/AdminSettingsTabs";

export const dynamic = "force-dynamic";

type SettingsTab = "sizes" | "sections" | "faqs" | "banner" | "blog";

function parseTab(value: string | undefined): SettingsTab {
  if (value === "sections" || value === "page") return "sections";
  if (value === "faqs") return "faqs";
  if (value === "banner") return "banner";
  if (value === "blog") return "blog";
  return "sizes";
}

export default async function AdminProductSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const admin = await requirePermission("products.view");
  const params = await searchParams;
  const tab = parseTab(params.tab);

  const [sizes, pageSettings] = await Promise.all([
    listAdminSizeOptions(),
    getProductPageSettings(),
  ]);

  const base = getAdminPath("/catalog/sizes");
  const canUpdate = hasPermission(admin, "products.update");

  return (
    <div className="w-full min-w-0 space-y-3">
      <AdminPageHeader
        title="Product settings"
        description="Size / pack, listing banner, detail sections, FAQs, and blog on product — all in one place."
        breadcrumbs={[
          { label: "Products", href: getAdminPath("/catalog/products") },
          { label: "Product settings" },
        ]}
      />
      <AdminSettingsTabs
        activeId={tab}
        tabs={[
          { id: "sizes", label: "Size / pack", href: `${base}?tab=sizes` },
          {
            id: "banner",
            label: "Listing banner",
            href: `${base}?tab=banner`,
          },
          {
            id: "sections",
            label: "Detail sections",
            href: `${base}?tab=sections`,
          },
          {
            id: "faqs",
            label: "FAQs",
            href: `${base}?tab=faqs`,
          },
          {
            id: "blog",
            label: "Blog",
            href: `${base}?tab=blog`,
          },
        ]}
      />
      {tab === "sizes" ? (
        <SizeOptionsManager
          initialSizes={sizes}
          canUpdate={canUpdate}
          canDelete={canUpdate || hasPermission(admin, "products.delete")}
        />
      ) : (
        <AdminProductPageSettings
          key={JSON.stringify(pageSettings)}
          initial={pageSettings}
          canUpdate={canUpdate}
          panel={
            tab === "faqs"
              ? "faqs"
              : tab === "banner"
                ? "banner"
                : tab === "blog"
                  ? "blog"
                  : "sections"
          }
        />
      )}
    </div>
  );
}
