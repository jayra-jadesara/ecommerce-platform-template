import { requirePermission } from "@/features/auth/session";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { AdminCustomerListClient } from "@/features/customers/components/AdminCustomerListClient";
import { listStoreCustomers } from "@/features/customers/service";

export const dynamic = "force-dynamic";

type ActivityFilter = "ALL" | "REPEAT" | "SINGLE";

function parseActivity(value: string | undefined): ActivityFilter {
  if (value === "REPEAT" || value === "SINGLE") return value;
  return "ALL";
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    activity?: string;
  }>;
}) {
  await requirePermission("customers.view");
  const storeId = await resolveActiveStoreId();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const rawPageSize = Number(params.pageSize) || 10;
  const pageSize = rawPageSize === 25 ? 25 : 10;
  const activity = parseActivity(params.activity);

  const result = await listStoreCustomers({
    storeId,
    page,
    pageSize,
    search: params.q ?? "",
    activity,
  });

  return (
    <div>
      <AdminPageHeader
        title="Customers"
        description="People who have paid for an order in your store."
        breadcrumbs={[{ label: "Customers" }]}
      />
      <AdminCustomerListClient
        initialItems={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        initialSearch={params.q ?? ""}
        initialActivity={activity}
      />
    </div>
  );
}
