import { EmptyState } from "@/components/ui/EmptyState";

export default function AccountAddressesPage() {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Addresses
      </h2>
      <div className="mt-6">
        <EmptyState
          title="Address book coming soon"
          description="Saved shipping addresses will appear here in a later phase."
        />
      </div>
    </div>
  );
}
