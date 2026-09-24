"use client";

import Link from "next/link";
import type { OrderListItem } from "@/features/orders/types";
import {
  PaymentMethodBadge,
  paymentInstrumentOrProviderLabel,
} from "@/features/orders/payment-method-ui";
import { orderStatusLabel } from "@/features/orders/state-machine";
import {
  orderStatusTone,
  paymentStatusTone,
  StatusPill,
} from "@/features/payments/components/payment-status-ui";
import { formatMoney } from "@/features/catalog/money";
import {
  sfAccountGridTable,
  sfAccountGridTd,
  sfAccountGridTh,
  sfAccountGridThead,
  sfAccountGridTr,
  sfAccountGridWrap,
  sfCard,
} from "@/components/ui/storefront-classes";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/cn";

function paymentStatusLabel(
  status: string | null | undefined,
  orderStatus?: string | null,
): string {
  if (
    orderStatus === "CANCELLED" &&
    (status === "PENDING" ||
      status === "CREATED" ||
      status === "FAILED" ||
      status === "CANCELLED")
  ) {
    return "Cancelled";
  }
  if (!status) return "—";
  if (status === "PENDING") return "Pending";
  if (status === "CAPTURED") return "Captured";
  if (status === "AUTHORIZED") return "Authorized";
  if (status === "CREATED") return "Created";
  if (status === "FAILED") return "Failed";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "REFUNDED") return "Refunded";
  return status;
}

function OrderPaymentCells({ order }: { order: OrderListItem }) {
  const provider = order.paymentProvider ?? null;
  const instrumentLine = paymentInstrumentOrProviderLabel({
    provider,
    paymentMethod: order.paymentMethod,
    instrument: order.paymentInstrument,
  });
  const showInstrumentDetail =
    Boolean(order.paymentInstrument) &&
    instrumentLine !== "Cash on Delivery" &&
    instrumentLine !== "Online payment" &&
    instrumentLine !== "Razorpay" &&
    instrumentLine !== "—";
  const paymentLabel = paymentStatusLabel(
    order.paymentStatus,
    order.status,
  );
  const paymentToneStatus =
    order.status === "CANCELLED" &&
    (order.paymentStatus === "PENDING" ||
      order.paymentStatus === "CREATED" ||
      order.paymentStatus === "FAILED" ||
      order.paymentStatus === "CANCELLED")
      ? "CANCELLED"
      : (order.paymentStatus ?? "");

  return (
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {provider ? <PaymentMethodBadge provider={provider} size="sm" /> : null}
        {order.paymentStatus ? (
          <StatusPill
            status={paymentLabel}
            tone={paymentStatusTone(paymentToneStatus)}
          />
        ) : (
          <span className="text-xs text-[var(--color-muted)]">No payment</span>
        )}
      </div>
      {showInstrumentDetail ? (
        <p className="truncate text-[0.7rem] text-[var(--color-muted)]">
          {instrumentLine}
        </p>
      ) : null}
    </div>
  );
}

export function AccountOrdersList({ orders }: { orders: OrderListItem[] }) {
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {orders.map((order) => {
          const tone = orderStatusTone(order.status);
          return (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.id}`}
                className={cn(sfCard(), "relative block overflow-hidden")}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-0 left-0 w-1",
                    tone === "success" && "bg-[var(--color-success)]",
                    tone === "error" && "bg-[var(--color-error)]",
                    tone === "warning" && "bg-[var(--color-warning)]",
                    tone === "neutral" && "bg-[var(--color-border)]",
                  )}
                />
                <div className="flex items-start justify-between gap-3 px-4 py-3 pl-5">
                  <div className="min-w-0 space-y-1.5">
                    <p className="truncate font-semibold">{order.orderNumber}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                      <span>{formatDateTime(order.createdAt)}</span>
                      <span aria-hidden>·</span>
                      <span>
                        {order.itemCount} item
                        {order.itemCount === 1 ? "" : "s"}
                      </span>
                      <StatusPill
                        status={orderStatusLabel(order.status)}
                        tone={tone}
                      />
                      {order.hasOpenReplace ? (
                        <span className="rounded-full bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                          Replace open
                        </span>
                      ) : null}
                    </div>
                    <OrderPaymentCells order={order} />
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums">
                    {formatMoney(order.grandTotal, order.currency)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className={sfAccountGridWrap()}>
        <table className={sfAccountGridTable()}>
          <thead className={sfAccountGridThead()}>
            <tr>
              <th className={sfAccountGridTh()}>Order</th>
              <th className={sfAccountGridTh()}>Date</th>
              <th className={sfAccountGridTh()}>Status</th>
              <th className={sfAccountGridTh()}>Payment</th>
              <th className={sfAccountGridTh("right")}>Items</th>
              <th className={sfAccountGridTh("right")}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const tone = orderStatusTone(order.status);
              return (
                <tr key={order.id} className={sfAccountGridTr()}>
                  <td className={sfAccountGridTd()}>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="font-semibold text-[var(--color-primary)] underline underline-offset-2 hover:opacity-80"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td
                    className={cn(
                      sfAccountGridTd(),
                      "whitespace-nowrap text-[var(--color-muted)]",
                    )}
                  >
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className={sfAccountGridTd()}>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill
                        status={orderStatusLabel(order.status)}
                        tone={tone}
                      />
                      {order.hasOpenReplace ? (
                        <span className="rounded-full bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                          Replace open
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className={sfAccountGridTd()}>
                    <OrderPaymentCells order={order} />
                  </td>
                  <td
                    className={cn(
                      sfAccountGridTd("right"),
                      "text-[var(--color-muted)]",
                    )}
                  >
                    {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                  </td>
                  <td
                    className={cn(
                      sfAccountGridTd("right"),
                      "font-semibold tabular-nums",
                    )}
                  >
                    {formatMoney(order.grandTotal, order.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
