import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/session";
import { AccountOrderDetailView } from "@/features/orders/components/AccountOrderDetailView";
import { getOrderDetail } from "@/features/orders/queries";

export const dynamic = "force-dynamic";

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/orders");

  const { id } = await params;
  let order = await getOrderDetail({ orderId: id, userId: user.id });
  if (!order) notFound();

  if (
    order.status === "SHIPPED" &&
    order.trackingNumber &&
    (order.courierProvider === "delhivery" ||
      order.courierProvider === "bluedart")
  ) {
    const { refreshOrderTracking } = await import(
      "@/features/shipping/courier/service"
    );
    await refreshOrderTracking({
      orderId: order.id,
      storeId: order.storeId,
      force: false,
    }).catch(() => null);
    order =
      (await getOrderDetail({ orderId: id, userId: user.id })) ?? order;
  }

  return <AccountOrderDetailView order={order} />;
}
