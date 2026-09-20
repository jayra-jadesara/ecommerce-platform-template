import { SizeOptionsManager } from "@/features/catalog/components/SizeOptionsManager";
import { listAdminSizeOptions } from "@/features/catalog/size-options-service";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminSizeOptionsPage() {
  const admin = await requirePermission("products.view");
  const sizes = await listAdminSizeOptions();

  return (
    <div className="w-full min-w-0 space-y-3">
      <AdminPageHeader
        title="Size / pack"
        description="Manage dropdown options used on product packs."
        breadcrumbs={[
          { label: "Products", href: getAdminPath("/catalog/products") },
          { label: "Size / pack" },
        ]}
      />
      <SizeOptionsManager
        initialSizes={sizes}
        canUpdate={hasPermission(admin, "products.update")}
        canDelete={
          hasPermission(admin, "products.update") ||
          hasPermission(admin, "products.delete")
        }
      />
    </div>
  );
}
