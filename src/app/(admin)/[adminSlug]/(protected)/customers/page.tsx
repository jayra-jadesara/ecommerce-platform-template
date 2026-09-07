import { EmptyState } from "@/components/ui/EmptyState";
import { requirePermission } from "@/features/auth/session";

export default async function AdminCustomersPage() {
  await requirePermission("customers.view");
  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Customers
      </h1>
      <div className="mt-6">
        <EmptyState
          title="Customer directory coming soon"
          description="Customer management will be implemented later."
        />
      </div>
    </div>
  );
}
