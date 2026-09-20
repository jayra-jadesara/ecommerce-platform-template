import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getCurrentUser } from "@/features/auth/session";
import { getOrderDetail } from "@/features/orders/queries";
import { PaymentSuccessView } from "@/features/payments/components/PaymentSuccessView";
import { buildPrivatePageMetadata } from "@/features/seo/private-metadata";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPrivatePageMetadata("Payment success");

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string; order?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/payment/success");
  }

  const params = await searchParams;
  const paymentId = params.paymentId?.trim();
  if (!paymentId) {
    redirect("/payment/failed");
  }

  const supabase = createSupabaseServiceClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, amount, currency, order_id, user_id, provider")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment || payment.user_id !== user.id) {
    redirect("/payment/failed");
  }

  const isCod = payment.provider === "cod";
  const confirmed =
    payment.status === "CAPTURED" ||
    payment.status === "AUTHORIZED" ||
    (isCod && payment.status === "PENDING");

  if (!confirmed) {
    redirect(`/payment/failed?paymentId=${encodeURIComponent(paymentId)}`);
  }

  const order = await getOrderDetail({
    orderId: payment.order_id,
    userId: user.id,
  });

  if (!order) {
    redirect("/payment/failed");
  }

  return (
    <PageShell
      showBack={false}
      className="!pb-8 !pt-6 md:!pb-10 md:!pt-8"
    >
      <PaymentSuccessView
        orderId={order.id}
        orderNumber={order.orderNumber}
        amount={Number(payment.amount)}
        currency={payment.currency}
        paymentStatus={payment.status}
        orderStatus={order.status}
        finalized={Boolean(order.inventoryFinalizedAt)}
        paymentMethod={isCod ? "cod" : "razorpay"}
        items={order.items}
        shippingAddress={order.shippingAddress}
        totals={{
          subtotal: order.subtotal,
          discountAmount: order.discountAmount,
          couponCode: order.couponCode,
          shippingAmount: order.shippingAmount,
          gatewayFee: order.gatewayFee,
          taxAmount: order.taxAmount,
          grandTotal: order.grandTotal,
        }}
      />
    </PageShell>
  );
}
