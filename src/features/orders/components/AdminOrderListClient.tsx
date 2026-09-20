"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { getAdminPath } from "@/config/admin-route";
import { formatMoney } from "@/features/catalog/money";
import { OrderProgressDots } from "@/features/orders/components/OrderProgressDots";
import { ReplaceProgress } from "@/features/orders/components/ReplaceProgress";
import { PaymentMethodBadge } from "@/features/orders/payment-method-ui";
import { formatPaymentInstrumentLabel } from "@/features/payments/razorpay-instrument";
import { orderStatusLabel } from "@/features/orders/state-machine";
import type { OrderListItem } from "@/features/orders/types";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { adminBtn, adminCard } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format-date";
import type { OrderStatus, PaymentStatus } from "@/types/database";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
] as const;

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

function buildPageItems(
  current: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
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
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const pageItems = useMemo(
    () => buildPageItems(page, totalPages),
    [page, totalPages],
  );

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

  const statusSelectOptions = useMemo(
    () =>
      statusOptions.map((option) => ({
        value: option,
        label: option === "ALL" ? "All statuses" : orderStatusLabel(option),
      })),
    [statusOptions],
  );

  const paymentSelectOptions = useMemo(
    () =>
      paymentOptions.map((option) => ({
        value: option,
        label: option === "ALL" ? "All payments" : option,
      })),
    [paymentOptions],
  );

  function applyFilters(options?: {
    page?: number;
    status?: string;
    payment?: string;
    search?: string;
    pageSize?: number;
  }) {
    const nextPage = options?.page ?? 1;
    const nextStatus = options?.status ?? status;
    const nextPayment = options?.payment ?? paymentStatus;
    const nextSearch = (options?.search ?? search).trim();
    const nextPageSize = options?.pageSize ?? pageSize;

    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextStatus && nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextPayment && nextPayment !== "ALL") {
      params.set("payment", nextPayment);
    }
    if (nextPageSize !== 10) params.set("pageSize", String(nextPageSize));
    if (nextPage > 1) params.set("page", String(nextPage));
    startTransition(() => {
      router.push(`${getAdminPath("/orders")}?${params.toString()}`);
    });
  }

  function commitSearch() {
    const next = search.trim();
    if (next === initialSearch.trim()) return;
    applyFilters({ search: next });
  }

  function clearFilters() {
    setSearch("");
    setStatus("ALL");
    setPaymentStatus("ALL");
    applyFilters({
      search: "",
      status: "ALL",
      payment: "ALL",
    });
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(initialSearch.trim()) ||
    status !== "ALL" ||
    paymentStatus !== "ALL";

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
                applyFilters({ status: chip.value });
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
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          commitSearch();
        }}
      >
        <TextField
          size="small"
          fullWidth
          label="Search"
          placeholder="Order number"
          value={search}
          disabled={pending}
          onChange={(event) => setSearch(event.target.value)}
          onBlur={commitSearch}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitSearch();
            }
          }}
          slotProps={{
            input: {
              endAdornment: hasActiveFilters ? (
                <InputAdornment position="end">
                  <IconButton
                    type="button"
                    size="small"
                    edge="end"
                    aria-label="Clear filters"
                    disabled={pending}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={clearFilters}
                    sx={{
                      color: "var(--color-muted)",
                      "&:hover": { color: "var(--color-foreground)" },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
        <AdminSelect
          label="Status"
          value={status}
          disabled={pending}
          options={statusSelectOptions}
          onChange={(next) => {
            setStatus(next);
            applyFilters({ status: next });
          }}
        />
        <AdminSelect
          label="Payment"
          value={paymentStatus}
          disabled={pending}
          options={paymentSelectOptions}
          onChange={(next) => {
            setPaymentStatus(next);
            applyFilters({ payment: next });
          }}
        />
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          {total === 0 ? (
            <>0 orders</>
          ) : (
            <>
              <span className="font-semibold text-[var(--color-foreground)]">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {total}
              </span>{" "}
              orders
              <span className="mx-2 text-[var(--color-muted)]">|</span>
              Page{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {page}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {totalPages}
              </span>
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {total > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || pending}
                onClick={() => applyFilters({ page: page - 1 })}
                className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-medium disabled:opacity-40"
              >
                Prev
              </button>

              {pageItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1.5 text-sm text-[var(--color-muted)]"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    disabled={pending || item === page}
                    onClick={() => applyFilters({ page: item })}
                    className={cn(
                      "h-9 min-w-9 rounded-xl border px-2.5 text-sm font-medium transition-colors disabled:opacity-100",
                      item === page
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                        : "border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)] disabled:opacity-40",
                    )}
                  >
                    {item}
                  </button>
                ),
              )}

              <button
                type="button"
                disabled={page >= totalPages || pending}
                onClick={() => applyFilters({ page: page + 1 })}
                className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}

          <div className="w-[7.5rem]">
            <AdminSelect
              label="Rows"
              value={String(pageSize)}
              disabled={pending}
              fullWidth
              options={PAGE_SIZE_OPTIONS}
              onChange={(value) => {
                const next = value === "25" ? 25 : 10;
                applyFilters({ pageSize: next, page: 1 });
              }}
            />
          </div>
        </div>
      </div>

      {!initialItems.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-12 text-center">
          <p className="text-sm font-semibold">No orders yet</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            When customers place orders, they will show up here.
          </p>
        </div>
      ) : (
        <div className={cn(adminCard(), "overflow-x-auto")}>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Payment / info</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialItems.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)]"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold">{order.orderNumber}</p>
                    <p className="mt-0.5 whitespace-nowrap text-xs text-[var(--color-muted)]">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {order.customerName || "Customer"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums">
                    {formatMoney(order.grandTotal, order.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const extra = formatPaymentInstrumentLabel(
                        order.paymentInstrument,
                        order.paymentMethod,
                      );
                      return (
                        <div className="flex min-w-[9.5rem] flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <AdminStatusBadge
                              tone={paymentTone(order.paymentStatus)}
                            >
                              {order.paymentStatus ?? "—"}
                            </AdminStatusBadge>
                            {order.paymentProvider ? (
                              <PaymentMethodBadge
                                provider={order.paymentProvider}
                                size="sm"
                              />
                            ) : null}
                          </div>
                          {extra ? (
                            <p className="max-w-[12rem] truncate text-[11px] leading-snug text-[var(--color-muted)]">
                              {extra}
                            </p>
                          ) : null}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <OrderProgressDots status={order.status} />
                      {order.openReplaceStatus ? (
                        <div>
                          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                            Replace
                          </p>
                          <ReplaceProgress
                            status={order.openReplaceStatus}
                            size="compact"
                          />
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={getAdminPath(`/orders/${order.id}`)}
                      className={cn(adminBtn("outline"), "!min-h-9 !px-3 !text-xs")}
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
    </div>
  );
}
