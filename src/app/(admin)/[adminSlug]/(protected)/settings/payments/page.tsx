import { requireAdmin, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { redirect } from "next/navigation";
import { PaymentSettingsForm } from "@/features/admin/settings/components/PaymentSettingsForm";
import {
  loadPaymentSettingsForm,
  loadShippingSettingsForm,
} from "@/features/admin/settings/update-shipping-payment";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminPaymentSettingsPage() {
  const admin = await requireAdmin("payments.view");
  const canUpdate = hasPermission(admin, "payments.update");
  const [{ values, currency, storeId }, shipping] = await Promise.all([
    loadPaymentSettingsForm(),
    loadShippingSettingsForm(),
  ]);
  if (!storeId) {
    redirect(getAdminPath("/unauthorized"));
  }

  return (
    <div>
      <AdminPageHeader
        title="Payments"
        description="Set how customers pay, plus optional checkout fees and tax."
        breadcrumbs={[
          { label: "Store Settings", href: getAdminPath("/settings") },
          { label: "Payments" },
        ]}
      />
      <PaymentSettingsForm
        initialValues={values}
        currency={currency}
        canUpdate={canUpdate}
        sampleShippingFee={
          shipping.values.enabled ? shipping.values.defaultShippingFee : 0
        }
      />
    </div>
  );
}
