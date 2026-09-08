import { EmptyState } from "@/components/ui/EmptyState";
import { requirePermission } from "@/features/auth/session";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export default async function AdminOrdersPage() {
  await requirePermission("orders.view");
  return (
    <div>
      <AdminPageHeader
        title="Orders"
        description="Track and fulfill customer orders."
        breadcrumbs={[{ label: "Orders" }]}
      />
      <EmptyState
        title="No orders yet"
        description="When customers place orders, they will appear here."
      />
    </div>
  );
}
