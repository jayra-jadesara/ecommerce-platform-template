"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getAdminPath } from "@/config/admin-route";
import type { StoreCustomerListItem } from "@/features/customers/service";
import { formatMoney } from "@/features/catalog/money";
import { adminBtn, adminCard, adminCardPadding } from "@/features/admin/ui/admin-classes";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/cn";

export function AdminCustomerListClient({
  initialItems,
  total,
  page,
  pageSize,
  initialSearch,
}: {
  initialItems: StoreCustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
  initialSearch: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [pending, startTransition] = useTransition();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function applySearch(nextPage = 1) {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    startTransition(() => {
      router.push(getAdminPath(`/customers${qs ? `?${qs}` : ""}`));
    });
  }

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          applySearch(1);
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, phone…"
          className="min-w-[16rem] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className={cn(adminBtn("primary"), "text-sm")}
        >
          Search
        </button>
      </form>

      <p className="text-sm text-[var(--color-muted)]">
        {total} customer{total === 1 ? "" : "s"} with paid orders in this store
      </p>

      <div className={`${adminCard()} ${adminCardPadding()} overflow-x-auto`}>
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
              <th className="pb-2 pr-3 font-medium">Customer</th>
              <th className="pb-2 pr-3 font-medium">Orders</th>
              <th className="pb-2 pr-3 font-medium">Spent</th>
              <th className="pb-2 font-medium">Last order</th>
            </tr>
          </thead>
          <tbody>
            {initialItems.map((customer) => (
              <tr
                key={customer.id}
                className="border-b border-[var(--color-border)] last:border-0"
              >
                <td className="py-3 pr-3 align-top">
                  <p className="font-medium text-[var(--color-foreground)]">
                    {customer.name || "Customer"}
                  </p>
                  {customer.email ? (
                    <p className="text-xs text-[var(--color-muted)]">
                      {customer.email}
                    </p>
                  ) : null}
                  {customer.phone ? (
                    <p className="text-xs text-[var(--color-muted)]">
                      {customer.phone}
                    </p>
                  ) : null}
                </td>
                <td className="py-3 pr-3 align-top">{customer.orderCount}</td>
                <td className="py-3 pr-3 align-top font-medium">
                  {formatMoney(customer.totalSpent, customer.currency)}
                </td>
                <td className="py-3 align-top">
                  {customer.lastOrderNumber ? (
                    <Link
                      href={getAdminPath(
                        `/orders?q=${encodeURIComponent(customer.lastOrderNumber)}`,
                      )}
                      className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                    >
                      {customer.lastOrderNumber}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {customer.lastOrderAt ? (
                    <p className="text-xs text-[var(--color-muted)]">
                      {formatDate(customer.lastOrderAt)}
                    </p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            disabled={pending || page <= 1}
            className={cn(adminBtn("outline"), "text-sm disabled:opacity-40")}
            onClick={() => applySearch(page - 1)}
          >
            Previous
          </button>
          <span className="text-[var(--color-muted)]">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={pending || page >= totalPages}
            className={cn(adminBtn("outline"), "text-sm disabled:opacity-40")}
            onClick={() => applySearch(page + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
