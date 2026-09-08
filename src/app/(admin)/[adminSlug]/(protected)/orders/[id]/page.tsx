import { notFound } from "next/navigation";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { hasPermission, requirePermission } from "@/features/auth/session";
import { AdminOrderDetailClient } from "@/features/orders/components/AdminOrderDetailClient";
import { getOrderDetail } from "@/features/orders/queries";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requirePermission("orders.view");
  const storeId = await resolveActiveStoreId();
  if (!storeId) notFound();

  const { id } = await params;
  const order = await getOrderDetail({
    orderId: id,
    storeId,
    asAdmin: true,
  });
  if (!order) notFound();

  return (
    <div>
      <AdminPageHeader
        title={order.orderNumber}
        description="Order details, payment, and fulfillment."
        breadcrumbs={[
          { label: "Orders", href: getAdminPath("/orders") },
          { label: order.orderNumber },
        ]}
      />
      <AdminOrderDetailClient
        initialOrder={order}
        canUpdate={hasPermission(admin, "orders.update")}
        canRefund={
          hasPermission(admin, "orders.update") &&
          hasPermission(admin, "payments.update")
        }
      />
    </div>
  );
}
