import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getCurrentUser } from "@/features/auth/session";
import { formatMoney } from "@/features/catalog/money";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { buildPrivatePageMetadata } from "@/features/seo/private-metadata";

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
    .select(
      "id, status, amount, currency, order_id, user_id, orders!inner(order_number, status, inventory_finalized_at)",
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment || payment.user_id !== user.id) {
    redirect("/payment/failed");
  }

  const order = payment.orders as unknown as {
    order_number: string;
    status: string;
    inventory_finalized_at: string | null;
  };

  const confirmed =
    payment.status === "CAPTURED" || payment.status === "AUTHORIZED";

  if (!confirmed) {
    redirect(`/payment/failed?paymentId=${encodeURIComponent(paymentId)}`);
  }

  return (
    <PageShell title="Payment successful">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <p className="text-sm text-[var(--color-muted)]">
          Your payment was verified on the server
          {order.inventory_finalized_at
            ? " and your order is confirmed."
            : ". Your order is being finalized."}
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt>Order</dt>
            <dd className="font-medium">{order.order_number}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Amount paid</dt>
            <dd className="font-medium">
              {formatMoney(Number(payment.amount), payment.currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Payment status</dt>
            <dd className="font-medium">{payment.status}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Order status</dt>
            <dd className="font-medium">{order.status}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/account/orders/${payment.order_id}`}
            className="inline-flex rounded-md bg-[var(--color-button-background)] px-4 py-2 text-sm font-medium text-[var(--color-button-foreground)]"
          >
            View order
          </Link>
          <Link
            href="/products"
            className="inline-flex rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
