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
  const order = await getOrderDetail({ orderId: id, userId: user.id });
  if (!order) notFound();

  return <AccountOrderDetailView order={order} />;
}
