"use client";

import Link from "next/link";
import type { OrderListItem } from "@/features/orders/types";
import { orderStatusLabel } from "@/features/orders/state-machine";
import {
  orderStatusTone,
  StatusPill,
} from "@/features/payments/components/payment-status-ui";
import { formatMoney } from "@/features/catalog/money";
import { sfCard } from "@/components/ui/storefront-classes";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/cn";

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
                <div className="flex items-center justify-between gap-3 px-4 py-3 pl-5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{order.orderNumber}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
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

      <div className={cn(sfCard(), "hidden overflow-x-auto md:block")}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const tone = orderStatusTone(order.status);
              return (
                <tr
                  key={order.id}
                  className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[color-mix(in_srgb,var(--color-primary)_4%,transparent)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="font-semibold text-[var(--color-foreground)] underline-offset-2 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--color-muted)]">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">
                    {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
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
