import { EmptyState } from "@/components/ui/EmptyState";
import { requirePermission } from "@/features/auth/session";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export default async function AdminCustomersPage() {
  await requirePermission("customers.view");
  return (
    <div>
      <AdminPageHeader
        title="Customers"
        description="See who has registered or purchased from your store."
        breadcrumbs={[{ label: "Customers" }]}
      />
      <EmptyState
        title="No customers yet"
        description="Customer accounts will show up here as people shop and register."
      />
    </div>
  );
}
