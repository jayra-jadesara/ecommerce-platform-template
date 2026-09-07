import { PageShell } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ProductsPage() {
  return (
    <PageShell
      title="Products"
      description="Product catalog will be connected in a later phase."
    >
      <EmptyState
        title="No products yet"
        description="This white-label foundation is ready for catalog data from Supabase."
      />
    </PageShell>
  );
}
