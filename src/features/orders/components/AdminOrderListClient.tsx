"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { getAdminPath } from "@/config/admin-route";
import { formatMoney } from "@/features/catalog/money";
import { orderStatusLabel } from "@/features/orders/state-machine";
import type { OrderListItem } from "@/features/orders/types";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format-date";
import type { OrderStatus, PaymentStatus } from "@/types/database";

function statusTone(
  status: OrderStatus,
): "success" | "warning" | "error" | "info" | "neutral" {
  switch (status) {
    case "DELIVERED":
      return "success";
    case "CANCELLED":
    case "REFUNDED":
      return "error";
    case "PENDING":
      return "warning";
    case "PROCESSING":
    case "SHIPPED":
    case "CONFIRMED":
      return "info";
    default:
      return "neutral";
  }
}

function paymentTone(
  status: PaymentStatus | null | undefined,
): "success" | "warning" | "error" | "info" | "neutral" {
  switch (status) {
    case "CAPTURED":
    case "AUTHORIZED":
      return "success";
    case "FAILED":
      return "error";
    case "PENDING":
      return "warning";
    case "REFUNDED":
      return "info";
    default:
      return "neutral";
  }
}

const SUMMARY_CHIPS: Array<{ value: OrderStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
];

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

  function applyFilters(
    nextPage = 1,
    nextStatus = status,
    nextPayment = paymentStatus,
  ) {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (nextStatus && nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextPayment && nextPayment !== "ALL") {
      params.set("payment", nextPayment);
    }
    if (nextPage > 1) params.set("page", String(nextPage));
    startTransition(() => {
      router.push(`${getAdminPath("/orders")}?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SUMMARY_CHIPS.map((chip) => {
          const active = status === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              disabled={pending}
              onClick={() => {
                setStatus(chip.value);
                applyFilters(1, chip.value, paymentStatus);
              }}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                  : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

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
          className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
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
          className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
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
          className={cn(adminBtn("primary"), "disabled:opacity-50")}
        >
          Filter
        </button>
      </form>

      {!initialItems.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-12 text-center">
          <p className="text-sm font-semibold">No orders yet</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            When customers place orders, they will show up here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-foreground)_4%)] text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {initialItems.map((order) => (
                <tr
                  key={order.id}
                  className="transition-colors hover:bg-[color-mix(in_srgb,var(--color-foreground)_3%,transparent)]"
                >
                  <td className="px-4 py-3.5 font-semibold">
                    {order.orderNumber}
                  </td>
                  <td className="px-4 py-3.5">
                    {order.customerName || "Customer"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    {formatMoney(order.grandTotal, order.currency)}
                  </td>
                  <td className="px-4 py-3.5">
                    <AdminStatusBadge tone={paymentTone(order.paymentStatus)}>
                      {order.paymentStatus ?? "—"}
                    </AdminStatusBadge>
                  </td>
                  <td className="px-4 py-3.5">
                    <AdminStatusBadge tone={statusTone(order.status)}>
                      {orderStatusLabel(order.status)}
                    </AdminStatusBadge>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={getAdminPath(`/orders/${order.id}`)}
                      className="text-sm font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
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
