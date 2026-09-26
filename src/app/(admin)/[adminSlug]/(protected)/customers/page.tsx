import { requirePermission, hasPermission } from "@/features/auth/session";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { AdminCustomerListClient } from "@/features/customers/components/AdminCustomerListClient";
import { getCustomerSessionMaxHours } from "@/features/customers/admin-mutations";
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
  const admin = await requirePermission("customers.view");
  const storeId = await resolveActiveStoreId();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const rawPageSize = Number(params.pageSize) || 10;
  const pageSize = rawPageSize === 25 ? 25 : 10;
  const activity = parseActivity(params.activity);

  const [result, customerSessionMaxHours] = await Promise.all([
    listStoreCustomers({
      storeId,
      page,
      pageSize,
      search: params.q ?? "",
      activity,
    }),
    getCustomerSessionMaxHours(storeId),
  ]);

  const canPassword = hasPermission(admin, "customers.password");
  const canDelete = hasPermission(admin, "customers.delete");
  const canEditSessionMax =
    canPassword || hasPermission(admin, "settings.update");

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
        canPassword={canPassword}
        canDelete={canDelete}
        canEditSessionMax={canEditSessionMax}
        customerSessionMaxHours={customerSessionMaxHours}
      />
    </div>
  );
}
