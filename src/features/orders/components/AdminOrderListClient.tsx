"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { getAdminPath } from "@/config/admin-route";
import { formatMoney } from "@/features/catalog/money";
import { orderStatusLabel } from "@/features/orders/state-machine";
import type { OrderListItem } from "@/features/orders/types";
import type { OrderStatus, PaymentStatus } from "@/types/database";

export function AdminOrderListClient({
  initialItems,
  total,
  page,
  pageSize,
  initialStatus,
  initialPaymentStatus,
  initialSearch,
  canUpdate,
}: {
  initialItems: OrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  initialStatus: string;
  initialPaymentStatus: string;
  initialSearch: string;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const statusOptions: Array<OrderStatus | "ALL"> = useMemo(
    () => [
      "ALL",
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
    ],
    [],
  );

  const paymentOptions: Array<PaymentStatus | "ALL"> = useMemo(
    () => [
      "ALL",
      "PENDING",
      "AUTHORIZED",
      "CAPTURED",
      "FAILED",
      "REFUNDED",
    ],
    [],
  );

  function applyFilters(nextPage = 1) {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (status && status !== "ALL") params.set("status", status);
    if (paymentStatus && paymentStatus !== "ALL") {
      params.set("payment", paymentStatus);
    }
    if (nextPage > 1) params.set("page", String(nextPage));
    startTransition(() => {
      router.push(`${getAdminPath("/orders")}?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-4">
      <form
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters(1);
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search order number"
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option === "ALL" ? "All statuses" : orderStatusLabel(option)}
            </option>
          ))}
        </select>
        <select
          value={paymentStatus}
          onChange={(event) => setPaymentStatus(event.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
        >
          {paymentOptions.map((option) => (
            <option key={option} value={option}>
              {option === "ALL" ? "All payments" : option}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--color-button-background)] px-3 py-2 text-sm font-medium text-[var(--color-button-foreground)] disabled:opacity-50"
        >
          Filter
        </button>
      </form>

      {!initialItems.length ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-10 text-center text-sm text-[var(--color-muted)]">
          No orders match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Payment</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {initialItems.map((order) => (
                <tr key={order.id}>
                  <td className="px-3 py-2 font-medium">{order.orderNumber}</td>
                  <td className="px-3 py-2">
                    {order.customerName || "Customer"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatMoney(order.grandTotal, order.currency)}
                  </td>
                  <td className="px-3 py-2">{order.paymentStatus ?? "—"}</td>
                  <td className="px-3 py-2">
                    {orderStatusLabel(order.status)}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={getAdminPath(`/orders/${order.id}`)}
                      className="underline"
                    >
                      {canUpdate ? "Manage" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={page <= 1 || pending}
            onClick={() => applyFilters(page - 1)}
            className="underline disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || pending}
            onClick={() => applyFilters(page + 1)}
            className="underline disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
