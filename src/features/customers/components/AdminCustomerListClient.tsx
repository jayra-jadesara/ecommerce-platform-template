"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { getAdminPath } from "@/config/admin-route";
import type { StoreCustomerListItem } from "@/features/customers/service";
import { formatMoney } from "@/features/catalog/money";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { adminBtn, adminCard } from "@/features/admin/ui/admin-classes";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/cn";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
] as const;

type ActivityFilter = "ALL" | "REPEAT" | "SINGLE";

const ACTIVITY_CHIPS: Array<{ value: ActivityFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "REPEAT", label: "Repeat" },
  { value: "SINGLE", label: "One order" },
];

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

export function AdminCustomerListClient({
  initialItems,
  total,
  page,
  pageSize,
  initialSearch,
  initialActivity,
}: {
  initialItems: StoreCustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
  initialSearch: string;
  initialActivity: ActivityFilter;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [activity, setActivity] = useState<ActivityFilter>(initialActivity);
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const pageItems = useMemo(
    () => buildPageItems(page, totalPages),
    [page, totalPages],
  );

  function applyFilters(options?: {
    page?: number;
    search?: string;
    pageSize?: number;
    activity?: ActivityFilter;
  }) {
    const nextPage = options?.page ?? 1;
    const nextSearch = (options?.search ?? search).trim();
    const nextPageSize = options?.pageSize ?? pageSize;
    const nextActivity = options?.activity ?? activity;

    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextActivity !== "ALL") params.set("activity", nextActivity);
    if (nextPageSize !== 10) params.set("pageSize", String(nextPageSize));
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    startTransition(() => {
      router.push(getAdminPath(`/customers${qs ? `?${qs}` : ""}`));
    });
  }

  function commitSearch() {
    const next = search.trim();
    if (next === initialSearch.trim()) return;
    applyFilters({ search: next });
  }

  function clearFilters() {
    setSearch("");
    setActivity("ALL");
    applyFilters({ search: "", activity: "ALL" });
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(initialSearch.trim()) ||
    activity !== "ALL";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ACTIVITY_CHIPS.map((chip) => {
          const active = activity === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              disabled={pending}
              onClick={() => {
                setActivity(chip.value);
                applyFilters({ activity: chip.value });
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
        className="grid gap-2 sm:grid-cols-1"
        onSubmit={(event) => {
          event.preventDefault();
          commitSearch();
        }}
      >
        <TextField
          size="small"
          fullWidth
          label="Search"
          placeholder="Name, email, phone, address…"
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
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          {total === 0 ? (
            <>0 customers</>
          ) : (
            <>
              <span className="font-semibold text-[var(--color-foreground)]">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {total}
              </span>{" "}
              customers
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
          <p className="text-sm font-semibold">
            {initialSearch || activity !== "ALL"
              ? "No matches"
              : "No customers yet"}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {initialSearch || activity !== "ALL"
              ? "Try a different search or filter."
              : "Customers appear after a successful paid order."}
          </p>
        </div>
      ) : (
        <div className={cn(adminCard(), "overflow-x-auto")}>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Address / info</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Spent</th>
                <th className="px-4 py-3 font-medium">Last order</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialItems.map((customer) => {
                const address = customer.address;
                const location = [address?.city, address?.state]
                  .filter(Boolean)
                  .join(", ");
                const postalCountry = [address?.postalCode, address?.country]
                  .filter(Boolean)
                  .join(" · ");
                return (
                <tr
                  key={customer.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)]"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--color-foreground)]">
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
                  <td className="px-4 py-3">
                    {address ? (
                      <div className="max-w-[16rem]">
                        {address.fullName &&
                        address.fullName !== customer.name ? (
                          <p className="text-xs font-medium text-[var(--color-foreground)]">
                            {address.fullName}
                          </p>
                        ) : null}
                        {address.line1 ? (
                          <p className="text-xs leading-snug text-[var(--color-foreground)]">
                            {address.line1}
                          </p>
                        ) : null}
                        {address.line2 ? (
                          <p className="text-xs leading-snug text-[var(--color-muted)]">
                            {address.line2}
                          </p>
                        ) : null}
                        {location ? (
                          <p className="text-xs text-[var(--color-muted)]">
                            {location}
                          </p>
                        ) : null}
                        {postalCountry ? (
                          <p className="text-xs text-[var(--color-muted)]">
                            {postalCountry}
                          </p>
                        ) : null}
                        {address.phone && address.phone !== customer.phone ? (
                          <p className="text-xs text-[var(--color-muted)]">
                            {address.phone}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[var(--color-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{customer.orderCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums">
                    {formatMoney(customer.totalSpent, customer.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {customer.lastOrderNumber ? (
                      <Link
                        href={getAdminPath(
                          `/orders?q=${encodeURIComponent(customer.lastOrderNumber)}`,
                        )}
                        className="font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
                      >
                        {customer.lastOrderNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {customer.lastOrderAt ? (
                      <p className="text-xs text-[var(--color-muted)]">
                        {formatDateTime(customer.lastOrderAt)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {customer.lastOrderNumber ? (
                      <Link
                        href={getAdminPath(
                          `/orders?q=${encodeURIComponent(customer.lastOrderNumber)}`,
                        )}
                        className={cn(adminBtn("outline"), "!min-h-9 !px-3 !text-xs")}
                      >
                        View order
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
