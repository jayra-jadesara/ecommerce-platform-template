import { requireAdmin, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { redirect } from "next/navigation";
import { ShippingSettingsForm } from "@/features/admin/settings/components/ShippingSettingsForm";
import { loadShippingSettingsForm } from "@/features/admin/settings/update-shipping-payment";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminShippingSettingsPage() {
  const admin = await requireAdmin("shipping.view");
  const canUpdate = hasPermission(admin, "shipping.update");
  const { values, currency, storeId } = await loadShippingSettingsForm();
  if (!storeId) {
    redirect(getAdminPath("/unauthorized"));
  }

  return (
    <div>
      <AdminPageHeader
        title="Shipping"
        description="Set your delivery charges and free-shipping rules."
        breadcrumbs={[
          { label: "Store Settings", href: getAdminPath("/settings") },
          { label: "Shipping" },
        ]}
      />
      <ShippingSettingsForm
        initialValues={values}
        currency={currency}
        canUpdate={canUpdate}
      />
    </div>
  );
}
