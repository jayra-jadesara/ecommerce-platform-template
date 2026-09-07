import { requireAdmin, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { redirect } from "next/navigation";
import { PaymentSettingsForm } from "@/features/admin/settings/components/PaymentSettingsForm";
import {
  loadPaymentSettingsForm,
  loadShippingSettingsForm,
} from "@/features/admin/settings/update-shipping-payment";

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
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Payments
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Business gateway fee and tax settings. Provider secrets stay in
        environment variables — never stored here. Razorpay checkout executes in
        a later phase.
      </p>
      <div className="mt-6 max-w-2xl">
        <PaymentSettingsForm
          initialValues={values}
          currency={currency}
          canUpdate={canUpdate}
          sampleShippingFee={
            shipping.values.enabled ? shipping.values.defaultShippingFee : 0
          }
        />
      </div>
    </div>
  );
}
