"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
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
import {
  adminBtn,
  adminCard,
  adminCardPadding,
} from "@/features/admin/ui/admin-classes";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
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

function buildHref(
  next: Partial<BlogPostListQuery>,
  current: BlogPostListQuery,
) {
  const params = new URLSearchParams();
  const merged = { ...current, ...next };
  if (merged.q) params.set("q", merged.q);
  if (merged.status && merged.status !== "all") params.set("status", merged.status);
  if (merged.categoryId) params.set("categoryId", merged.categoryId);
  if (merged.featured && merged.featured !== "all") {
    params.set("featured", merged.featured);
  }
  if (merged.page > 1) params.set("page", String(merged.page));
  if (merged.pageSize !== 20) params.set("pageSize", String(merged.pageSize));
  const qs = params.toString();
  return `${getAdminPath("/content/blog")}${qs ? `?${qs}` : ""}`;
}

function panelHref(panel: "new" | "edit", id?: string) {
  const params = new URLSearchParams();
  params.set("panel", panel);
  if (id) params.set("id", id);
  return `${getAdminPath("/content/blog")}?${params.toString()}`;
}

const statusColor: Record<
  string,
  "default" | "success" | "warning" | "info"
> = {
  draft: "default",
  published: "success",
  archived: "warning",
};

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
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));

  return (
    <div className="space-y-4">
      <div className={`${adminCard()} ${adminCardPadding()}`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <form
            className="flex flex-wrap items-end gap-2"
            action={(formData) => {
              const q = String(formData.get("q") ?? "");
              const status = String(formData.get("status") ?? "all");
              const categoryId = String(formData.get("categoryId") ?? "");
              const featured = String(formData.get("featured") ?? "all");
              router.push(
                buildHref(
                  {
                    q,
                    status: status as BlogPostListQuery["status"],
                    categoryId,
                    featured: featured as BlogPostListQuery["featured"],
                    page: 1,
                  },
                  query,
                ),
              );
            }}
          >
            <TextField
              name="q"
              label="Search articles"
              size="small"
              defaultValue={query.q}
              placeholder="Title, author…"
            />
            <TextField
              name="status"
              label="Status"
              size="small"
              select
              defaultValue={query.status}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="all">All statuses</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </TextField>
            <TextField
              name="categoryId"
              label="Category"
              size="small"
              select
              defaultValue={query.categoryId ?? ""}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">All categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              name="featured"
              label="Featured"
              size="small"
              select
              defaultValue={
                query.featured === "yes" || query.featured === "no"
                  ? query.featured
                  : "all"
              }
              sx={{ minWidth: 130 }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="yes">Featured</MenuItem>
              <MenuItem value="no">Not featured</MenuItem>
            </TextField>
            <button type="submit" className={adminBtn("outline")}>
              Apply filters
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`${getAdminPath("/content/blog")}?panel=categories`}
              className={adminBtn("outline")}
            >
              Categories
            </Link>
            <Link
              href={`${getAdminPath("/content/blog")}?panel=settings`}
              className={adminBtn("outline")}
            >
              Settings
            </Link>
            {canCreate ? (
              <Link href={panelHref("new")} className={adminBtn("primary")}>
                + New article
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">Image</th>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Published</th>
              <th className="px-3 py-2 font-medium">Updated</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-14 text-center">
                  <p className="font-medium text-[var(--color-foreground)]">
                    Create your first article
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    Share stories, ideas and useful content with your customers.
                  </p>
                  {canCreate ? (
                    <Link
                      href={panelHref("new")}
                      className={`${adminBtn("primary")} mt-4 inline-flex`}
                    >
                      + New article
                    </Link>
                  ) : null}
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const thumb =
                  item.featuredImageUrl ??
                  resolveCmsImageUrl(item.featuredImagePath);
                return (
                  <tr
                    key={item.id}
                    className="border-t border-[var(--color-border)]"
                  >
                    <td className="px-3 py-2">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="h-12 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-[var(--color-surface)] text-xs text-[var(--color-muted)]">
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-[var(--color-foreground)]">
                        {item.title}
                        {item.isFeatured ? (
                          <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
                            Featured
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-[var(--color-muted)]">
                        /blog/{item.slug}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      {item.primaryCategoryName ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Chip
                        size="small"
                        label={item.status}
                        color={statusColor[item.status] ?? "default"}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {formatDateTime(item.publishedAt)}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">
                      {formatDateTime(item.updatedAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {canUpdate ? (
                          <Link
                            href={panelHref("edit", item.id)}
                            className="underline"
                          >
                            Edit
                          </Link>
                        ) : null}
                        {item.status === "published" ? (
                          <Link
                            href={`/blog/${item.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            View on store
                          </Link>
                        ) : (
                          <Link
                            href={`/blog/${item.slug}?preview=1`}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                            title="Storefront preview (when available)"
                          >
                            Preview
                          </Link>
                        )}
                        {canPublish && item.status !== "published" ? (
                          <button
                            type="button"
                            disabled={pending}
                            className="underline"
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
                            className="underline"
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
                            className="underline"
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
                            className="text-red-700 underline"
                            onClick={() => {
                              setError(null);
                              setDeleteTarget(item);
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="text-[var(--color-muted)]">
            Page {query.page} of {pageCount} · {total} articles
          </p>
          <div className="flex gap-2">
            {query.page > 1 ? (
              <Link
                href={buildHref({ page: query.page - 1 }, query)}
                className={adminBtn("outline")}
              >
                Previous
              </Link>
            ) : null}
            {query.page < pageCount ? (
              <Link
                href={buildHref({ page: query.page + 1 }, query)}
                className={adminBtn("outline")}
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

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
