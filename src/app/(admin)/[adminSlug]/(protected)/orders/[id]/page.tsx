import { notFound } from "next/navigation";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { hasPermission, requirePermission } from "@/features/auth/session";
import { AdminOrderDetailClient } from "@/features/orders/components/AdminOrderDetailClient";
import { autoDeliverShippedOrders } from "@/features/orders/auto-deliver";
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

  await autoDeliverShippedOrders({ storeId, limit: 50 }).catch(() => null);

  const { id } = await params;

  const { loadCourierCredentials, refreshOrderTracking } = await import(
    "@/features/shipping/courier/service"
  );
  const credentials = await loadCourierCredentials(storeId);
  const activeCourier =
    credentials.defaultProvider === "bluedart" ? "bluedart" : "delhivery";

  await refreshOrderTracking({
    orderId: id,
    storeId,
    force: false,
  }).catch(() => null);

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
        description="See progress at a glance, then move the order to the next step."
        breadcrumbs={[
          { label: "Orders", href: getAdminPath("/orders") },
          { label: order.orderNumber },
        ]}
      />
      <AdminOrderDetailClient
        initialOrder={order}
        activeCourier={activeCourier}
        canUpdate={hasPermission(admin, "orders.update")}
        canRefund={
          hasPermission(admin, "orders.update") &&
          hasPermission(admin, "payments.update")
        }
      />
    </div>
  );
}
