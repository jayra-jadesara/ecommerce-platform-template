import { requireAdmin, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { redirect } from "next/navigation";
import { ShippingSettingsForm } from "@/features/admin/settings/components/ShippingSettingsForm";
import { loadShippingSettingsForm } from "@/features/admin/settings/update-shipping-payment";

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
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Shipping
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Configure flat shipping fees and free-shipping thresholds. Checkout
        totals use the centralized pricing engine.
      </p>
      <div className="mt-6 max-w-2xl">
        <ShippingSettingsForm
          initialValues={values}
          currency={currency}
          canUpdate={canUpdate}
        />
      </div>
    </div>
  );
}
