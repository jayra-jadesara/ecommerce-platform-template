import Alert from "@mui/material/Alert";
import { GeneralSettingsForm } from "@/features/admin/settings/components/GeneralSettingsForm";
import { loadGeneralSettingsForm } from "@/features/admin/settings/load-forms";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminGeneralSettingsPage() {
  const admin = await requirePermission("settings.view");
  const [{ values }, storeId] = await Promise.all([
    loadGeneralSettingsForm(),
    resolveActiveStoreId(),
  ]);
  const canUpdate = hasPermission(admin, "settings.update");

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Store Information"
        description="Your store name, address, currency, and how customers contact you."
        breadcrumbs={[
          { label: "Store Settings", href: getAdminPath("/settings") },
          { label: "Store Information" },
        ]}
      />
      {!storeId && canUpdate ? (
        <Alert severity="info">
          No store is set up yet. Fill in the form and click{" "}
          <strong>Save changes</strong> — we&apos;ll create your store
          automatically.
        </Alert>
      ) : null}
      <GeneralSettingsForm initialValues={values} canUpdate={canUpdate} />
    </div>
  );
}
