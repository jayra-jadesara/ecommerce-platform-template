"use client";

import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { getAdminPath } from "@/config/admin-route";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { adminCard } from "@/features/admin/ui/admin-classes";
import { updateProductReviewStatusAction } from "@/features/reviews/actions";
import { StarRating } from "@/features/reviews/components/StarRating";
import type { AdminProductReview } from "@/features/reviews/types";
import type { ProductReviewStatus } from "@/types/database";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format-date";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
] as const;

const STATUS_OPTIONS: Array<{
  value: ProductReviewStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "hidden", label: "Hidden" },
];

const MODERATE_ACTIONS: Array<{
  status: ProductReviewStatus;
  label: string;
}> = [
  { status: "approved", label: "Approve" },
  { status: "rejected", label: "Reject" },
  { status: "hidden", label: "Hide" },
];

function statusTone(
  status: ProductReviewStatus,
): "success" | "warning" | "neutral" | "info" | "error" {
  switch (status) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "error";
    case "hidden":
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

export function AdminReviewsManager({
  initialItems,
  total,
  page,
  pageSize,
  initialStatus,
  initialSearch,
  canModerate,
  adminBasePath,
}: {
  initialItems: AdminProductReview[];
  total: number;
  page: number;
  pageSize: number;
  initialStatus: ProductReviewStatus | "all";
  initialSearch: string;
  canModerate: boolean;
  adminBasePath: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<ProductReviewStatus | "all">(
    initialStatus,
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const pageItems = useMemo(
    () => buildPageItems(page, totalPages),
    [page, totalPages],
  );

  const statusSelectOptions = useMemo(
    () =>
      STATUS_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [],
  );

  function applyFilters(options?: {
    page?: number;
    status?: ProductReviewStatus | "all";
    search?: string;
    pageSize?: number;
  }) {
    const nextPage = options?.page ?? 1;
    const nextStatus = options?.status ?? status;
    const nextSearch = (options?.search ?? search).trim();
    const nextPageSize = options?.pageSize ?? pageSize;

    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (nextPageSize !== 10) params.set("pageSize", String(nextPageSize));
    if (nextPage > 1) params.set("page", String(nextPage));

    startTransition(() => {
      router.push(`${getAdminPath("/catalog/reviews")}?${params.toString()}`);
    });
  }

  function commitSearch() {
    const next = search.trim();
    if (next === initialSearch.trim()) return;
    applyFilters({ search: next });
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    applyFilters({ search: "", status: "all" });
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(initialSearch.trim()) ||
    status !== "all";

  return (
    <div className="space-y-4">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-start"
        onSubmit={(event) => {
          event.preventDefault();
          commitSearch();
        }}
      >
        <div className="min-w-0 flex-1 sm:max-w-md">
          <TextField
            size="small"
            fullWidth
            label="Search"
            placeholder="Author, review text…"
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
        </div>
        <div className="w-full sm:w-[11.5rem] sm:shrink-0">
          <AdminSelect
            label="Status"
            value={status}
            disabled={pending}
            fullWidth
            options={statusSelectOptions}
            onChange={(next) => {
              const value = next as ProductReviewStatus | "all";
              setStatus(value);
              applyFilters({ status: value });
            }}
          />
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          {total === 0 ? (
            <>0 reviews</>
          ) : (
            <>
              <span className="font-semibold text-[var(--color-foreground)]">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {total}
              </span>{" "}
              reviews
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

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {!initialItems.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-12 text-center">
          <p className="text-sm font-semibold">No reviews match this filter</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Try another status or clear search.
          </p>
        </div>
      ) : (
        <div className={cn(adminCard(), "overflow-x-auto")}>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--color-surface)] text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 font-medium">Rating</th>
                <th className="px-3 py-2.5 font-medium">Review</th>
                <th className="px-3 py-2.5 font-medium">Author</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Submitted</th>
                {canModerate ? (
                  <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {initialItems.map((review) => (
                <tr
                  key={review.id}
                  className="border-t border-[var(--color-border)] align-top"
                >
                  <td className="px-3 py-2.5">
                    <Link
                      href={`${adminBasePath}/catalog/products`}
                      className="font-medium text-[var(--color-foreground)] underline-offset-2 hover:underline"
                    >
                      {review.productName}
                    </Link>
                    {review.productSlug ? (
                      <a
                        href={`/products/${review.productSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block text-[0.7rem] text-[var(--color-primary)] underline-offset-2 hover:underline"
                      >
                        View on store
                      </a>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <StarRating value={review.rating} size="sm" />
                  </td>
                  <td className="max-w-[16rem] px-3 py-2.5">
                    {review.title ? (
                      <p className="font-medium text-[var(--color-foreground)]">
                        {review.title}
                      </p>
                    ) : null}
                    {review.body?.trim() ? (
                      <p className="line-clamp-3 whitespace-pre-wrap text-[var(--color-muted)]">
                        {review.body}
                      </p>
                    ) : (
                      <p className="text-[var(--color-muted)] italic">
                        Rating only
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-muted)]">
                    {review.authorName ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <AdminStatusBadge tone={statusTone(review.status)}>
                      {review.status}
                    </AdminStatusBadge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--color-muted)]">
                    {formatDateTime(review.createdAt)}
                  </td>
                  {canModerate ? (
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        {MODERATE_ACTIONS.map((action) => (
                          <button
                            key={action.status}
                            type="button"
                            disabled={
                              pending || review.status === action.status
                            }
                            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[0.65rem] font-semibold disabled:opacity-40"
                            onClick={() => {
                              startTransition(async () => {
                                setError(null);
                                const result =
                                  await updateProductReviewStatusAction(
                                    review.id,
                                    action.status,
                                    review.productSlug || null,
                                  );
                                if (!result.ok) {
                                  setError(result.error);
                                  return;
                                }
                                router.refresh();
                              });
                            }}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
