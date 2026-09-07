import { EmptyState } from "@/components/ui/EmptyState";

export default function AccountOrdersPage() {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Orders
      </h2>
      <div className="mt-6">
        <EmptyState
          title="No orders yet"
          description="Order history will be available once checkout is implemented."
        />
      </div>
    </div>
  );
}
