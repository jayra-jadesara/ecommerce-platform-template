import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/session";
import { formatMoney } from "@/features/catalog/money";
import { getOrderDetail } from "@/features/orders/queries";
import { orderStatusLabel } from "@/features/orders/state-machine";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--color-muted)]">
            <Link href="/account/orders" className="underline">
              Orders
            </Link>{" "}
            / {order.orderNumber}
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
            {order.orderNumber}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {new Date(order.createdAt).toLocaleString()} ·{" "}
            {orderStatusLabel(order.status)}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h3 className="font-semibold">Items</h3>
        <ul className="mt-3 divide-y divide-[var(--color-border)]">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3 py-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-[var(--color-surface)]">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-contain p-1"
                    sizes="64px"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.productName}</p>
                <p className="text-sm text-[var(--color-muted)]">
                  {item.variantName} · Qty {item.quantity}
                </p>
              </div>
              <p className="text-sm font-medium">
                {formatMoney(item.lineTotal, order.currency)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h3 className="font-semibold">Shipping</h3>
          <p className="mt-2 text-sm">
            {order.shippingAddress.fullName}
            <br />
            {order.shippingAddress.addressLine1}
            {order.shippingAddress.addressLine2 ? (
              <>
                <br />
                {order.shippingAddress.addressLine2}
              </>
            ) : null}
            <br />
            {[
              order.shippingAddress.city,
              order.shippingAddress.state,
              order.shippingAddress.postalCode,
            ]
              .filter(Boolean)
              .join(", ")}
            <br />
            {order.shippingAddress.country}
          </p>
          {order.trackingNumber ? (
            <p className="mt-3 text-sm">
              <span className="text-[var(--color-muted)]">Tracking:</span>{" "}
              {order.shippingProvider ? `${order.shippingProvider} · ` : ""}
              {order.trackingNumber}
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h3 className="font-semibold">Payment</h3>
          {order.payment ? (
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-muted)]">Status</dt>
                <dd>{order.payment.status}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-muted)]">Provider</dt>
                <dd className="capitalize">{order.payment.provider}</dd>
              </div>
              {order.payment.paymentMethod ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--color-muted)]">Method</dt>
                  <dd>{order.payment.paymentMethod}</dd>
                </div>
              ) : null}
              {order.payment.providerPaymentId ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--color-muted)]">Reference</dt>
                  <dd className="truncate text-xs">
                    {order.payment.providerPaymentId}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              No payment on file.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h3 className="font-semibold">Totals</h3>
        <dl className="mt-3 space-y-1 text-sm">
          {[
            ["Subtotal", order.subtotal],
            [
              order.couponCode
                ? `Discount (${order.couponCode})`
                : "Discount",
              order.discountAmount,
            ],
            ["Shipping", order.shippingAmount],
            ["Payment fee", order.gatewayFee],
            ["Tax", order.taxAmount],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between">
              <dt>{label}</dt>
              <dd>{formatMoney(Number(value), order.currency)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-[var(--color-border)] pt-2 text-base font-semibold">
            <dt>Grand total</dt>
            <dd>{formatMoney(order.grandTotal, order.currency)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
