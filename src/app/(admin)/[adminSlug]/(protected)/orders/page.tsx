import { EmptyState } from "@/components/ui/EmptyState";
import { requirePermission } from "@/features/auth/session";

export default async function AdminOrdersPage() {
  await requirePermission("orders.view");
  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Orders
      </h1>
      <div className="mt-6">
        <EmptyState
          title="Order management coming soon"
          description="Fulfillment tools will be added in a later phase."
        />
      </div>
    </div>
  );
}
