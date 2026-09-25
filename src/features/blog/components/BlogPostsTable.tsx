"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { getAdminPath } from "@/config/admin-route";
import {
  archiveBlogPostAction,
  deleteBlogPostAction,
  publishBlogPostAction,
  unpublishBlogPostAction,
} from "@/features/blog/actions";
import type { BlogPostListQuery } from "@/features/blog/schemas";
import type { AdminBlogPostListItem, BlogCategory } from "@/features/blog/types";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { adminBtn, adminCard } from "@/features/admin/ui/admin-classes";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format-date";

interface BlogPostsTableProps {
  items: AdminBlogPostListItem[];
  total: number;
  query: BlogPostListQuery;
  categories: BlogCategory[];
  canCreate: boolean;
  canUpdate: boolean;
  canPublish: boolean;
  canDelete: boolean;
}

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
] as const;

const STATUS_CHIPS: Array<{
  value: BlogPostListQuery["status"];
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
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

function statusTone(
  status: string,
): "success" | "warning" | "error" | "info" | "neutral" {
  switch (status) {
    case "published":
      return "success";
    case "draft":
      return "neutral";
    case "archived":
      return "warning";
    default:
      return "neutral";
  }
}

function panelHref(panel: "new" | "edit", id?: string) {
  const params = new URLSearchParams();
  params.set("panel", panel);
  if (id) params.set("id", id);
  return `${getAdminPath("/content/blog")}?${params.toString()}`;
}

export function BlogPostsTable({
  items,
  total,
  query,
  categories,
  canCreate,
  canUpdate,
  canPublish,
  canDelete,
}: BlogPostsTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<AdminBlogPostListItem | null>(null);

  const [search, setSearch] = useState(query.q ?? "");
  const [status, setStatus] = useState(query.status);
  const [categoryId, setCategoryId] = useState(query.categoryId ?? "");
  const [featured, setFeatured] = useState<
    BlogPostListQuery["featured"]
  >(
    query.featured === "yes" || query.featured === "no"
      ? query.featured
      : "all",
  );

  const page = query.page;
  const pageSize = query.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const pageItems = useMemo(
    () => buildPageItems(page, totalPages),
    [page, totalPages],
  );

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All topics" },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ],
    [categories],
  );

  const statusSelectOptions = useMemo(
    () => [
      { value: "all", label: "All statuses" },
      { value: "draft", label: "Draft" },
      { value: "published", label: "Published" },
      { value: "archived", label: "Archived" },
    ],
    [],
  );

  const featuredSelectOptions = useMemo(
    () => [
      { value: "all", label: "All articles" },
      { value: "yes", label: "Featured" },
      { value: "no", label: "Not featured" },
    ],
    [],
  );

  function applyFilters(options?: {
    page?: number;
    status?: BlogPostListQuery["status"];
    categoryId?: string;
    featured?: BlogPostListQuery["featured"];
    search?: string;
    pageSize?: number;
  }) {
    const nextPage = options?.page ?? 1;
    const nextStatus = options?.status ?? status;
    const nextCategoryId =
      options?.categoryId !== undefined ? options.categoryId : categoryId;
    const nextFeatured = options?.featured ?? featured;
    const nextSearch = (options?.search ?? search).trim();
    const nextPageSize = options?.pageSize ?? pageSize;

    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (nextCategoryId) params.set("categoryId", nextCategoryId);
    if (nextFeatured && nextFeatured !== "all") {
      params.set("featured", nextFeatured);
    }
    if (nextPageSize !== 10) params.set("pageSize", String(nextPageSize));
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    startTransition(() => {
      router.push(`${getAdminPath("/content/blog")}${qs ? `?${qs}` : ""}`);
    });
  }

  function commitSearch() {
    const next = search.trim();
    if (next === (query.q ?? "").trim()) return;
    applyFilters({ search: next });
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setCategoryId("");
    setFeatured("all");
    applyFilters({
      search: "",
      status: "all",
      categoryId: "",
      featured: "all",
    });
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean((query.q ?? "").trim()) ||
    status !== "all" ||
    Boolean(categoryId) ||
    featured !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map((chip) => {
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

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`${getAdminPath("/content/blog")}?panel=categories`}
            className={cn(adminBtn("outline"), "!min-h-9 !px-3 !text-xs")}
          >
            Categories
          </Link>
          <Link
            href={`${getAdminPath("/content/blog")}?panel=settings`}
            className={cn(adminBtn("outline"), "!min-h-9 !px-3 !text-xs")}
          >
            Settings
          </Link>
          {canCreate ? (
            <Link
              href={panelHref("new")}
              className={cn(adminBtn("primary"), "!min-h-9 !px-3 !text-xs")}
            >
              + New
            </Link>
          ) : null}
        </div>
      </div>

      <form
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          commitSearch();
        }}
      >
        <TextField
          size="small"
          fullWidth
          label="Search"
          placeholder="Title, author…"
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
            const value = next as BlogPostListQuery["status"];
            setStatus(value);
            applyFilters({ status: value });
          }}
        />
        <AdminSelect
          label="Topic"
          value={categoryId}
          disabled={pending}
          options={categoryOptions}
          onChange={(next) => {
            setCategoryId(next);
            applyFilters({ categoryId: next });
          }}
        />
        <AdminSelect
          label="Featured"
          value={featured}
          disabled={pending}
          options={featuredSelectOptions}
          onChange={(next) => {
            const value = next as BlogPostListQuery["featured"];
            setFeatured(value);
            applyFilters({ featured: value });
          }}
        />
      </form>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          {total === 0 ? (
            <>0 articles</>
          ) : (
            <>
              <span className="font-semibold text-[var(--color-foreground)]">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {total}
              </span>{" "}
              articles
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
              value={String(pageSize === 25 ? 25 : 10)}
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

      {!items.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-12 text-center">
          <p className="text-sm font-semibold">No articles yet</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Write your first story for the storefront blog.
          </p>
          {canCreate ? (
            <Link
              href={panelHref("new")}
              className={cn(adminBtn("primary"), "mt-4 inline-flex !min-h-9 !px-3 !text-xs")}
            >
              + New article
            </Link>
          ) : null}
        </div>
      ) : (
        <div className={cn(adminCard(), "overflow-x-auto")}>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Article</th>
                <th className="px-4 py-3 font-medium">Topic</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Published</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const thumb =
                  item.featuredImageUrl ??
                  resolveCmsImageUrl(item.featuredImagePath);
                return (
                  <tr
                    key={item.id}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt=""
                            className="h-10 w-14 shrink-0 rounded-lg object-cover ring-1 ring-[var(--color-border)]"
                          />
                        ) : (
                          <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] text-xs text-[var(--color-muted)] ring-1 ring-[var(--color-border)]">
                            —
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--color-foreground)]">
                            {item.title}
                            {item.isFeatured ? (
                              <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
                                Featured
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
                            /blog/{item.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.primaryCategoryName ? (
                        <span className="inline-flex max-w-[10rem] truncate rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-foreground)]">
                          {item.primaryCategoryName}
                        </span>
                      ) : (
                        <span className="text-[var(--color-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={statusTone(item.status)}>
                        {item.status}
                      </AdminStatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-muted)]">
                      {item.publishedAt
                        ? formatDateTime(item.publishedAt)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        {canUpdate ? (
                          <Link
                            href={panelHref("edit", item.id)}
                            className={cn(
                              adminBtn("outline"),
                              "!min-h-9 !px-3 !text-xs",
                            )}
                          >
                            Edit
                          </Link>
                        ) : null}
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                          <Link
                            href={
                              item.status === "published"
                                ? `/blog/${item.slug}`
                                : `/blog/${item.slug}?preview=1`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:underline"
                          >
                            {item.status === "published" ? "View" : "Preview"}
                          </Link>
                          {canPublish && item.status !== "published" ? (
                            <button
                              type="button"
                              disabled={pending}
                              className="font-medium text-[var(--color-foreground)] hover:underline disabled:opacity-50"
                              onClick={() => {
                                setError(null);
                                startTransition(async () => {
                                  const result = await publishBlogPostAction(
                                    item.id,
                                  );
                                  if (!result.ok) setError(result.error);
                                  router.refresh();
                                });
                              }}
                            >
                              Publish
                            </button>
                          ) : null}
                          {canPublish && item.status === "published" ? (
                            <button
                              type="button"
                              disabled={pending}
                              className="font-medium text-[var(--color-muted)] hover:underline disabled:opacity-50"
                              onClick={() => {
                                setError(null);
                                startTransition(async () => {
                                  const result = await unpublishBlogPostAction(
                                    item.id,
                                  );
                                  if (!result.ok) setError(result.error);
                                  router.refresh();
                                });
                              }}
                            >
                              Unpublish
                            </button>
                          ) : null}
                          {canUpdate && item.status !== "archived" ? (
                            <button
                              type="button"
                              disabled={pending}
                              className="font-medium text-[var(--color-muted)] hover:underline disabled:opacity-50"
                              onClick={() => {
                                setError(null);
                                startTransition(async () => {
                                  const result = await archiveBlogPostAction(
                                    item.id,
                                  );
                                  if (!result.ok) setError(result.error);
                                  router.refresh();
                                });
                              }}
                            >
                              Archive
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              disabled={pending}
                              className="font-medium text-red-600 hover:underline disabled:opacity-50"
                              onClick={() => {
                                setError(null);
                                setDeleteTarget(item);
                              }}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Delete article?"
        message={`Delete “${deleteTarget?.title ?? "this article"}”? This cannot be undone.`}
        pending={pending}
        onClose={() => {
          if (pending) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteBlogPostAction(deleteTarget.id);
            if (!result.ok) setError(result.error);
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
