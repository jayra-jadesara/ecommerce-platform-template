"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatMoney } from "@/features/catalog/money";
import {
  adminMarkOrderRefundedAction,
  adminUpdateOrderStatusAction,
  adminUpdateOrderTrackingAction,
} from "@/features/orders/actions";
import { canTransitionOrderStatus, orderStatusLabel } from "@/features/orders/state-machine";
import type { OrderDetail } from "@/features/orders/types";
import type { OrderStatus } from "@/types/database";
import { formatDateTime } from "@/lib/format-date";

const ACTION_FLOW: Array<{ label: string; status: OrderStatus }> = [
  { label: "Process order", status: "PROCESSING" },
  { label: "Mark as shipped", status: "SHIPPED" },
  { label: "Mark as delivered", status: "DELIVERED" },
  { label: "Cancel order", status: "CANCELLED" },
];

export function AdminOrderDetailClient({
  initialOrder,
  canUpdate,
  canRefund,
}: {
  initialOrder: OrderDetail;
  canUpdate: boolean;
  canRefund: boolean;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [provider, setProvider] = useState(order.shippingProvider ?? "");
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string; order?: OrderDetail; message?: string }>) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      if (result.order) setOrder(result.order);
      setSuccess(result.message ?? "Saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">
          {success}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="font-semibold">Order summary</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--color-muted)]">Order</dt>
              <dd className="font-medium">{order.orderNumber}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--color-muted)]">Status</dt>
              <dd>{orderStatusLabel(order.status)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--color-muted)]">Placed</dt>
              <dd>{formatDateTime(order.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--color-muted)]">Customer</dt>
              <dd>{order.customerName || "Customer"}</dd>
            </div>
          </dl>
        </section>

        {canUpdate ? (
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <h2 className="font-semibold">Fulfillment</h2>
            <div className="mt-3 flex flex-col gap-2">
              {ACTION_FLOW.map((action) => {
                const allowed = canTransitionOrderStatus(order.status, action.status);
                return (
                  <button
                    key={action.status}
                    type="button"
                    disabled={!allowed || pending}
                    onClick={() => {
                      if (action.status === "CANCELLED") {
                        if (!window.confirm("Cancel this order?")) return;
                      }
                      if (action.status === "SHIPPED") {
                        run(() =>
                          adminUpdateOrderStatusAction({
                            orderId: order.id,
                            nextStatus: "SHIPPED",
                            shippingProvider: provider,
                            trackingNumber: tracking,
                          }),
                        );
                        return;
                      }
                      run(() =>
                        adminUpdateOrderStatusAction({
                          orderId: order.id,
                          nextStatus: action.status,
                        }),
                      );
                    }}
                    className="rounded-md border border-[var(--color-border)] px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {action.label}
                  </button>
                );
              })}
              {canRefund && canTransitionOrderStatus(order.status, "REFUNDED") ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Mark this order as refunded locally? This does not automatically refund via the payment provider.",
                      )
                    ) {
                      return;
                    }
                    run(() =>
                      adminMarkOrderRefundedAction({ orderId: order.id }),
                    );
                  }}
                  className="rounded-md border border-red-300 px-3 py-2 text-left text-sm text-red-700"
                >
                  Mark refunded (local)
                </button>
              ) : null}
            </div>

            <div className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4">
              <p className="text-sm font-medium">Tracking</p>
              <input
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
                placeholder="Shipping provider"
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              />
              <input
                value={tracking}
                onChange={(event) => setTracking(event.target.value)}
                placeholder="Tracking number"
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    adminUpdateOrderTrackingAction({
                      orderId: order.id,
                      shippingProvider: provider,
                      trackingNumber: tracking,
                    }),
                  )
                }
                className="rounded-md bg-[var(--color-button-background)] px-3 py-2 text-sm font-medium text-[var(--color-button-foreground)]"
              >
                Save tracking
              </button>
            </div>
          </section>
        ) : null}
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="font-semibold">Items</h2>
        <ul className="mt-3 divide-y divide-[var(--color-border)] text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-2">
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-[var(--color-muted)]">
                  {item.variantName} · Qty {item.quantity} · {item.sku}
                </p>
              </div>
              <p>{formatMoney(item.lineTotal, order.currency)}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm">
          <h2 className="font-semibold">Shipping address</h2>
          <p className="mt-2 whitespace-pre-line">
            {[
              order.shippingAddress.fullName,
              order.shippingAddress.addressLine1,
              order.shippingAddress.addressLine2,
              [
                order.shippingAddress.city,
                order.shippingAddress.state,
                order.shippingAddress.postalCode,
              ]
                .filter(Boolean)
                .join(", "),
              order.shippingAddress.country,
              order.shippingAddress.phone,
            ]
              .filter(Boolean)
              .join("\n")}
          </p>
        </section>
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm">
          <h2 className="font-semibold">Payment</h2>
          {order.payment ? (
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-muted)]">Status</dt>
                <dd>{order.payment.status}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-muted)]">Amount</dt>
                <dd>
                  {formatMoney(order.payment.amount, order.payment.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-muted)]">Provider</dt>
                <dd>{order.payment.provider}</dd>
              </div>
              {order.payment.providerPaymentId ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--color-muted)]">Payment ID</dt>
                  <dd className="truncate text-xs">
                    {order.payment.providerPaymentId}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-2 text-[var(--color-muted)]">No payment linked.</p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="font-semibold">Totals</h2>
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
          <div className="flex justify-between border-t border-[var(--color-border)] pt-2 font-semibold">
            <dt>Grand total</dt>
            <dd>{formatMoney(order.grandTotal, order.currency)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="font-semibold">Activity</h2>
        {!order.activities.length ? (
          <p className="mt-2 text-sm text-[var(--color-muted)]">No activity yet.</p>
        ) : (
          <ol className="mt-3 space-y-2 text-sm">
            {order.activities.map((activity) => (
              <li key={activity.id} className="border-l-2 border-[var(--color-border)] pl-3">
                <p className="font-medium">{activity.message || activity.eventType}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {formatDateTime(activity.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
