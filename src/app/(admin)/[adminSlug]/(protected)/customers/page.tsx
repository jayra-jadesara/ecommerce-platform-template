import { EmptyState } from "@/components/ui/EmptyState";
import { requirePermission } from "@/features/auth/session";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { AdminCustomerListClient } from "@/features/customers/components/AdminCustomerListClient";
import { listStoreCustomers } from "@/features/customers/service";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  await requirePermission("customers.view");
  const storeId = await resolveActiveStoreId();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const result = await listStoreCustomers({
    storeId,
    page,
    pageSize: 20,
    search: params.q ?? "",
  });

  return (
    <div>
      <AdminPageHeader
        title="Customers"
        description="People who have paid for an order in your store."
        breadcrumbs={[{ label: "Customers" }]}
      />
      {!result.items.length && !params.q ? (
        <EmptyState
          title="No customers yet"
          description="Customers appear here after a successful paid order (failed checkouts are not counted)."
        />
      ) : !result.items.length ? (
        <EmptyState
          title="No matches"
          description="Try a different name, email, or phone search."
        />
      ) : (
        <AdminCustomerListClient
          initialItems={result.items}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          initialSearch={params.q ?? ""}
        />
      )}
    </div>
  );
}
