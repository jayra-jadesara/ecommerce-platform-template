"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { getAdminPath } from "@/config/admin-route";
import { formatMoney } from "@/features/catalog/money";
import { deleteCouponAction } from "@/features/coupons/actions";
import type { AdminCouponListItem } from "@/features/coupons/admin-service";
import type { CouponListQuery } from "@/features/coupons/schemas";
import { couponStatusLabel } from "@/features/coupons/status";

interface CouponListTableProps {
  items: AdminCouponListItem[];
  total: number;
  query: CouponListQuery;
  currency: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

function buildHref(next: Partial<CouponListQuery>, current: CouponListQuery) {
  const params = new URLSearchParams();
  const merged = { ...current, ...next };
  if (merged.q) params.set("q", merged.q);
  if (merged.status && merged.status !== "all") params.set("status", merged.status);
  if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);
  if (merged.page > 1) params.set("page", String(merged.page));
  if (merged.pageSize !== 20) params.set("pageSize", String(merged.pageSize));
  const qs = params.toString();
  return `${getAdminPath("/settings/coupons")}${qs ? `?${qs}` : ""}`;
}

function panelHref(panel: "new" | "edit", id?: string) {
  const params = new URLSearchParams();
  params.set("panel", panel);
  if (id) params.set("id", id);
  return `${getAdminPath("/settings/coupons")}?${params.toString()}`;
}

function formatDiscount(item: AdminCouponListItem, currency: string): string {
  if (item.discountType === "percentage") {
    return `${item.discountValue}%`;
  }
  return formatMoney(item.discountValue, currency);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const statusColor: Record<
  string,
  "default" | "success" | "warning" | "error" | "info"
> = {
  ACTIVE: "success",
  INACTIVE: "default",
  SCHEDULED: "info",
  EXPIRED: "warning",
  EXHAUSTED: "error",
};

export function CouponListTable({
  items,
  total,
  query,
  currency,
  canCreate,
  canUpdate,
  canDelete,
}: CouponListTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <form
          className="flex flex-wrap items-end gap-2"
          action={(formData) => {
            const q = String(formData.get("q") ?? "");
            const status = String(formData.get("status") ?? "all");
            const sort = String(formData.get("sort") ?? "newest");
            router.push(
              buildHref(
                {
                  q,
                  status: status as CouponListQuery["status"],
                  sort: sort as CouponListQuery["sort"],
                  page: 1,
                },
                query,
              ),
            );
          }}
        >
          <TextField
            name="q"
            label="Search"
            size="small"
            defaultValue={query.q}
            placeholder="Code or description"
          />
          <TextField
            name="status"
            label="Status"
            size="small"
            select
            defaultValue={query.status}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="scheduled">Scheduled</MenuItem>
            <MenuItem value="expired">Expired</MenuItem>
            <MenuItem value="exhausted">Exhausted</MenuItem>
          </TextField>
          <TextField
            name="sort"
            label="Sort"
            size="small"
            select
            defaultValue={query.sort}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="oldest">Oldest</MenuItem>
            <MenuItem value="code">Code A–Z</MenuItem>
            <MenuItem value="code_desc">Code Z–A</MenuItem>
            <MenuItem value="expiry">Expiry</MenuItem>
          </TextField>
          <button
            type="submit"
            className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium"
          >
            Apply
          </button>
        </form>

        {canCreate ? (
          <Link
            href={panelHref("new")}
            className="rounded-md bg-[var(--color-button-background)] px-4 py-2 text-sm font-medium text-[var(--color-button-foreground)]"
          >
            Create coupon
          </Link>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Discount</th>
              <th className="px-3 py-2 font-medium">Minimum order</th>
              <th className="px-3 py-2 font-medium">Usage</th>
              <th className="px-3 py-2 font-medium">Start</th>
              <th className="px-3 py-2 font-medium">Expiry</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-[var(--color-muted)]"
                >
                  No coupons yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-[var(--color-border)]"
                >
                  <td className="px-3 py-2 font-medium">{item.code}</td>
                  <td className="px-3 py-2">
                    {formatDiscount(item, currency)}
                  </td>
                  <td className="px-3 py-2">
                    {item.minimumOrderAmount != null
                      ? formatMoney(item.minimumOrderAmount, currency)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {item.redemptionCount}
                    {item.usageLimit != null ? ` / ${item.usageLimit}` : ""}
                  </td>
                  <td className="px-3 py-2">{formatDate(item.startsAt)}</td>
                  <td className="px-3 py-2">{formatDate(item.expiresAt)}</td>
                  <td className="px-3 py-2">
                    <Chip
                      size="small"
                      label={couponStatusLabel(item.status)}
                      color={statusColor[item.status] ?? "default"}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {canUpdate ? (
                        <Link
                          href={panelHref("edit", item.id)}
                          className="text-sm font-medium underline"
                        >
                          Edit
                        </Link>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          disabled={pending}
                          className="text-sm font-medium text-red-700 underline disabled:opacity-50"
                          onClick={() => {
                            if (
                              !window.confirm(
                                item.redemptionCount > 0
                                  ? "This coupon has usage history and will be deactivated. Continue?"
                                  : "Delete this coupon?",
                              )
                            ) {
                              return;
                            }
                            startTransition(async () => {
                              await deleteCouponAction(item.id);
                              router.refresh();
                            });
                          }}
                        >
                          {item.redemptionCount > 0 ? "Deactivate" : "Delete"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--color-muted)]">
        <span>
          {total} coupon{total === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={buildHref({ page: Math.max(1, query.page - 1) }, query)}
            aria-disabled={query.page <= 1}
            className={query.page <= 1 ? "pointer-events-none opacity-40" : "underline"}
          >
            Previous
          </Link>
          <span>
            Page {query.page} of {pageCount}
          </span>
          <Link
            href={buildHref(
              { page: Math.min(pageCount, query.page + 1) },
              query,
            )}
            aria-disabled={query.page >= pageCount}
            className={
              query.page >= pageCount ? "pointer-events-none opacity-40" : "underline"
            }
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
