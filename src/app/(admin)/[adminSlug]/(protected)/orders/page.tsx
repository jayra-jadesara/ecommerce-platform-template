import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { hasPermission, requirePermission } from "@/features/auth/session";
import { AdminOrderListClient } from "@/features/orders/components/AdminOrderListClient";
import { listAdminOrders } from "@/features/orders/queries";
import type { OrderStatus, PaymentStatus } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    payment?: string;
  }>;
}) {
  const admin = await requirePermission("orders.view");
  const storeId = await resolveActiveStoreId();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = (params.status as OrderStatus | "ALL" | undefined) ?? "ALL";
  const paymentStatus =
    (params.payment as PaymentStatus | "ALL" | undefined) ?? "ALL";

  const result = await listAdminOrders({
    storeId,
    page,
    pageSize: 20,
    search: params.q ?? "",
    status,
    paymentStatus,
  });

  return (
    <div>
      <AdminPageHeader
        title="Orders"
        description="Track payments, fulfill shipments, and help customers."
        breadcrumbs={[{ label: "Orders" }]}
      />
      <AdminOrderListClient
        initialItems={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        initialStatus={status}
        initialPaymentStatus={paymentStatus}
        initialSearch={params.q ?? ""}
        canUpdate={hasPermission(admin, "orders.update")}
      />
    </div>
  );
}
