import { EmptyState } from "@/components/ui/EmptyState";

export default function AccountPaymentsPage() {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Payments
      </h2>
      <div className="mt-6">
        <EmptyState
          title="Payments coming soon"
          description="Payment history will appear here after Razorpay integration."
        />
      </div>
    </div>
  );
}
