"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { AdminProductListItem } from "@/features/catalog/products-service";
import type { CategoryRow } from "@/features/catalog/categories-service";
import type { ProductListQuery } from "@/features/catalog/validation";
import { PRODUCT_SORT_OPTIONS } from "@/features/catalog/validation";
import {
  archiveProductAction,
  checkProductDependenciesAction,
  deleteProductAction,
} from "@/features/catalog/actions";
import { formatMoney } from "@/features/catalog/money";
import { getAdminPath } from "@/config/admin-route";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";

interface ProductListTableProps {
  items: AdminProductListItem[];
  total: number;
  query: ProductListQuery;
  categories: CategoryRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  currency?: string;
}

function buildHref(next: Partial<ProductListQuery>, current: ProductListQuery) {
  const params = new URLSearchParams();
  const merged = { ...current, ...next };
  if (merged.q) params.set("q", merged.q);
  if (merged.categoryId) params.set("categoryId", merged.categoryId);
  if (merged.status && merged.status !== "all") params.set("status", merged.status);
  if (merged.featured && merged.featured !== "all") {
    params.set("featured", merged.featured);
  }
  if (merged.stock && merged.stock !== "all") params.set("stock", merged.stock);
  if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);
  if (merged.page > 1) params.set("page", String(merged.page));
  if (merged.pageSize !== 20) params.set("pageSize", String(merged.pageSize));
  const qs = params.toString();
  return `${getAdminPath("/catalog/products")}${qs ? `?${qs}` : ""}`;
}

function panelHref(panel: "new" | "edit" | "view", id?: string) {
  const params = new URLSearchParams();
  params.set("panel", panel);
  if (id) params.set("id", id);
  return `${getAdminPath("/catalog/products")}?${params.toString()}`;
}

const stockLabel: Record<string, string> = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
};

const stockColor: Record<string, "default" | "success" | "warning" | "error"> = {
  IN_STOCK: "success",
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "error",
};

const sortLabels: Record<string, string> = {
  newest: "Newest",
  oldest: "Oldest",
  name: "Name A–Z",
  name_desc: "Name Z–A",
  price: "Price: low to high",
  price_desc: "Price: high to low",
  stock: "Stock",
  featured: "Featured first",
};

function formatPriceRange(
  minPrice: number | null,
  maxPrice: number | null,
  currency: string,
): string {
  if (minPrice == null) return "—";
  if (maxPrice == null || minPrice === maxPrice) {
    return formatMoney(minPrice, currency);
  }
  return `${formatMoney(minPrice, currency)} – ${formatMoney(maxPrice, currency)}`;
}

function ProductThumb({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full items-center justify-center text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]"
          aria-hidden
          title={name}
        >
          No img
        </div>
      )}
    </div>
  );
}

export function ProductListTable({
  items,
  total,
  query,
  categories,
  canCreate,
  canUpdate,
  canDelete,
  currency = "INR",
}: ProductListTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<AdminProductListItem | null>(
    null,
  );
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const emptyFilters =
    !query.q &&
    !query.categoryId &&
    query.status === "all" &&
    query.featured === "all" &&
    query.stock === "all";

  function openDelete(item: AdminProductListItem) {
    setListError(null);
    setDeleteTarget(item);
    setDeleteBlocked(false);
    setDeleteMessage(`Delete “${item.name}”? This cannot be undone.`);
    startTransition(async () => {
      const check = await checkProductDependenciesAction(item.id);
      if (!check.ok) {
        setListError(check.error);
        setDeleteTarget(null);
        return;
      }
      if (!check.deps.canDelete) {
        setDeleteBlocked(true);
        setDeleteMessage(check.deps.message);
      }
    });
  }

  function confirmDelete(item: AdminProductListItem) {
    openDelete(item);
  }

  return (
    <div style={adminStackStyle}>
      {listError ? (
        <p className="text-sm text-[var(--color-error)]" role="alert">
          {listError}
        </p>
      ) : null}
      <div
        className={`${adminCard()} ${adminCardPadding()}`}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              Find products
            </p>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              Search, filter, or add a new item to your catalog.
            </p>
          </div>
          {canCreate ? (
            <Link href={panelHref("new")} className={adminBtn("primary")}>
              + Add product
            </Link>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <TextField
            label="Search by name"
            size="small"
            fullWidth
            defaultValue={query.q}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                const value = (event.target as HTMLInputElement).value;
                router.push(buildHref({ q: value, page: 1 }, query));
              }
            }}
            helperText="Press Enter to search"
          />
          <TextField
            select
            label="Category"
            size="small"
            fullWidth
            value={query.categoryId ?? ""}
            onChange={(event) =>
              router.push(
                buildHref(
                  { categoryId: event.target.value || undefined, page: 1 },
                  query,
                ),
              )
            }
          >
            <MenuItem value="">All categories</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            size="small"
            fullWidth
            value={query.status}
            onChange={(event) =>
              router.push(
                buildHref(
                  {
                    status: event.target.value as ProductListQuery["status"],
                    page: 1,
                  },
                  query,
                ),
              )
            }
          >
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </TextField>
          <TextField
            select
            label="Stock"
            size="small"
            fullWidth
            value={query.stock}
            onChange={(event) =>
              router.push(
                buildHref(
                  {
                    stock: event.target.value as ProductListQuery["stock"],
                    page: 1,
                  },
                  query,
                ),
              )
            }
          >
            <MenuItem value="all">All stock</MenuItem>
            <MenuItem value="IN_STOCK">In stock</MenuItem>
            <MenuItem value="LOW_STOCK">Low stock</MenuItem>
            <MenuItem value="OUT_OF_STOCK">Out of stock</MenuItem>
          </TextField>
          <TextField
            select
            label="Sort by"
            size="small"
            fullWidth
            value={query.sort}
            onChange={(event) =>
              router.push(
                buildHref(
                  {
                    sort: event.target.value as ProductListQuery["sort"],
                    page: 1,
                  },
                  query,
                ),
              )
            }
          >
            {PRODUCT_SORT_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {sortLabels[option] ?? option}
              </MenuItem>
            ))}
          </TextField>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {items.length === 0 ? (
          <EmptyState
            emptyFilters={emptyFilters}
            canCreate={canCreate}
            panelHref={panelHref("new")}
          />
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className={`${adminCard()} flex gap-3 p-3`}
            >
              <ProductThumb name={item.name} imageUrl={item.imageUrl} />
              <div className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={panelHref("view", item.id)}
                      className="font-semibold text-[var(--color-foreground)] hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-[var(--color-muted)]">
                      {item.categoryName ?? "No category"}
                      {" · "}
                      {formatPriceRange(item.minPrice, item.maxPrice, currency)}
                    </p>
                  </div>
                  <Chip
                    size="small"
                    label={
                      item.status.charAt(0).toUpperCase() + item.status.slice(1)
                    }
                    variant="outlined"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip
                    size="small"
                    label={stockLabel[item.stockStatus] ?? item.stockStatus}
                    color={stockColor[item.stockStatus]}
                  />
                  {item.featured ? (
                    <Chip size="small" label="Featured" color="warning" variant="outlined" />
                  ) : null}
                  <div className="ml-auto flex flex-wrap gap-1">
                    <Link href={panelHref("view", item.id)} className={adminBtn("ghost")}>
                      View
                    </Link>
                    <Link
                      href={panelHref("edit", item.id)}
                      className={`${adminBtn("outline")} ${!canUpdate ? "pointer-events-none opacity-50" : ""}`}
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      className={adminBtn("danger")}
                      disabled={!canDelete || pending}
                      onClick={() => confirmDelete(item)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className={`${adminCard()} hidden min-h-[16rem] overflow-x-auto md:block`}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <EmptyState
                    emptyFilters={emptyFilters}
                    canCreate={canCreate}
                    panelHref={panelHref("new")}
                  />
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumb name={item.name} imageUrl={item.imageUrl} />
                      <div className="min-w-0">
                        <Link
                          href={panelHref("view", item.id)}
                          className="font-semibold text-[var(--color-foreground)] hover:underline"
                        >
                          {item.name}
                        </Link>
                        <p className="text-xs text-[var(--color-muted)]">
                          {item.featured ? "Featured · " : ""}
                          {item.variantCount} pack
                          {item.variantCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-foreground)]">
                    {item.categoryName ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {formatPriceRange(item.minPrice, item.maxPrice, currency)}
                  </td>
                  <td className="px-4 py-3">
                    <Chip
                      size="small"
                      label={stockLabel[item.stockStatus] ?? item.stockStatus}
                      color={stockColor[item.stockStatus]}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Chip
                      size="small"
                      label={
                        item.status.charAt(0).toUpperCase() + item.status.slice(1)
                      }
                      variant="outlined"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={panelHref("view", item.id)} className={adminBtn("ghost")}>
                        View
                      </Link>
                      <Link
                        href={panelHref("edit", item.id)}
                        className={`${adminBtn("outline")} ${!canUpdate ? "pointer-events-none opacity-50" : ""}`}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        className={adminBtn("danger")}
                        disabled={!canDelete || pending}
                        onClick={() => confirmDelete(item)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-[var(--color-muted)]">
          {total} product{total === 1 ? "" : "s"} · page {query.page} of{" "}
          {totalPages}
        </p>
        <div className="flex gap-2">
          <Link
            href={buildHref({ page: query.page - 1 }, query)}
            className={`${adminBtn("outline")} ${query.page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            aria-disabled={query.page <= 1}
          >
            Previous
          </Link>
          <Link
            href={buildHref({ page: query.page + 1 }, query)}
            className={`${adminBtn("outline")} ${query.page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
            aria-disabled={query.page >= totalPages}
          >
            Next
          </Link>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title={
          deleteBlocked ? "Can't delete this product" : "Delete product?"
        }
        message={deleteMessage}
        blocked={deleteBlocked}
        warningTone={deleteBlocked}
        safeActionLabel="Archive"
        pending={pending}
        onClose={() => {
          if (pending) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await deleteProductAction(deleteTarget.id);
            if (!result.ok) {
              setListError(result.error);
              setDeleteTarget(null);
              return;
            }
            setDeleteTarget(null);
            router.refresh();
          });
        }}
        onSafeAction={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await archiveProductAction(deleteTarget.id);
            if (!result.ok) {
              setListError(result.error);
              setDeleteTarget(null);
              return;
            }
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}

function EmptyState({
  emptyFilters,
  canCreate,
  panelHref,
}: {
  emptyFilters: boolean;
  canCreate: boolean;
  panelHref: string;
}) {
  if (!emptyFilters) {
    return (
      <p className="text-[var(--color-muted)]">No products match these filters.</p>
    );
  }
  return (
    <div className="space-y-3 py-4">
      <p className="font-semibold text-[var(--color-foreground)]">No products yet</p>
      <p className="text-sm text-[var(--color-muted)]">
        Add your first product to start selling on the storefront.
      </p>
      {canCreate ? (
        <Link href={panelHref} className={adminBtn("primary")}>
          Add your first product
        </Link>
      ) : null}
    </div>
  );
}
