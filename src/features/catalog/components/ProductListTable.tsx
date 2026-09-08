"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { AdminProductListItem } from "@/features/catalog/products-service";
import type { CategoryRow } from "@/features/catalog/categories-service";
import type { ProductListQuery } from "@/features/catalog/validation";
import { PRODUCT_SORT_OPTIONS } from "@/features/catalog/validation";
import { deleteProductAction } from "@/features/catalog/actions";
import { getAdminPath } from "@/config/admin-route";

interface ProductListTableProps {
  items: AdminProductListItem[];
  total: number;
  query: ProductListQuery;
  categories: CategoryRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
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

export function ProductListTable({
  items,
  total,
  query,
  categories,
  canCreate,
  canUpdate,
  canDelete,
}: ProductListTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const emptyFilters =
    !query.q &&
    !query.categoryId &&
    query.status === "all" &&
    query.featured === "all" &&
    query.stock === "all";

  return (
    <div className="flex flex-1 flex-col space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <TextField
            label="Search products..."
            size="small"
            fullWidth
            defaultValue={query.q}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                const value = (event.target as HTMLInputElement).value;
                router.push(buildHref({ q: value, page: 1 }, query));
              }
            }}
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
            <MenuItem value="all">All</MenuItem>
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
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="IN_STOCK">In stock</MenuItem>
            <MenuItem value="LOW_STOCK">Low stock</MenuItem>
            <MenuItem value="OUT_OF_STOCK">Out of stock</MenuItem>
          </TextField>
          <TextField
            select
            label="Sort"
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
          <Button
            variant="contained"
            disabled={!canCreate}
            href={panelHref("new")}
            className="!h-[40px] sm:!self-end"
            fullWidth
          >
            + Add Product
          </Button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-1 flex-col gap-3 md:hidden">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-12 text-center">
            {emptyFilters ? (
              <div className="space-y-3">
                <p className="font-medium">No products yet.</p>
                <p className="text-sm text-[var(--color-muted)]">
                  Add your first product to start selling.
                </p>
                {canCreate ? (
                  <Button variant="contained" href={panelHref("new")}>
                    Add Your First Product
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-[var(--color-muted)]">
                No products match these filters.
              </p>
            )}
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={panelHref("view", item.id)}
                    className="font-medium hover:underline"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {item.categoryName ?? "No category"}
                    {" · "}
                    {item.minPrice == null
                      ? "—"
                      : item.minPrice === item.maxPrice
                        ? item.minPrice.toFixed(2)
                        : `${item.minPrice.toFixed(2)} – ${item.maxPrice?.toFixed(2)}`}
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
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip
                  size="small"
                  label={stockLabel[item.stockStatus] ?? item.stockStatus}
                  color={stockColor[item.stockStatus]}
                />
                <div className="ml-auto flex flex-wrap gap-1">
                  <Button size="small" href={panelHref("view", item.id)}>
                    View
                  </Button>
                  <Button
                    size="small"
                    disabled={!canUpdate}
                    href={panelHref("edit", item.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    disabled={!canDelete || pending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Delete “${item.name}”? This cannot be undone.`,
                        )
                      ) {
                        return;
                      }
                      startTransition(async () => {
                        const result = await deleteProductAction(item.id);
                        if (result.ok) router.refresh();
                        else window.alert(result.error);
                      });
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Desktop / tablet table */}
      <div className="hidden min-h-[16rem] flex-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Price</th>
              <th className="px-3 py-3">Stock</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-16 text-center">
                  {emptyFilters ? (
                    <div className="space-y-3">
                      <p className="font-medium">No products yet.</p>
                      <p className="text-sm text-[var(--color-muted)]">
                        Add your first product to start selling.
                      </p>
                      {canCreate ? (
                        <Button variant="contained" href={panelHref("new")}>
                          Add Your First Product
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-[var(--color-muted)]">
                      No products match these filters.
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--color-border)] last:border-0"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-surface)] text-xs text-[var(--color-muted)]"
                        aria-hidden
                      >
                        —
                      </div>
                      <div>
                        <Link
                          href={panelHref("view", item.id)}
                          className="font-medium text-[var(--color-foreground)] hover:underline"
                        >
                          {item.name}
                        </Link>
                        {item.featured ? (
                          <p className="text-xs text-[var(--color-muted)]">
                            Featured
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{item.categoryName ?? "—"}</td>
                  <td className="px-3 py-3">
                    {item.minPrice == null
                      ? "—"
                      : item.minPrice === item.maxPrice
                        ? item.minPrice.toFixed(2)
                        : `${item.minPrice.toFixed(2)} – ${item.maxPrice?.toFixed(2)}`}
                  </td>
                  <td className="px-3 py-3">
                    <Chip
                      size="small"
                      label={stockLabel[item.stockStatus] ?? item.stockStatus}
                      color={stockColor[item.stockStatus]}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Chip
                      size="small"
                      label={
                        item.status.charAt(0).toUpperCase() + item.status.slice(1)
                      }
                      variant="outlined"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button size="small" href={panelHref("view", item.id)}>
                        View
                      </Button>
                      <Button
                        size="small"
                        disabled={!canUpdate}
                        href={panelHref("edit", item.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        disabled={!canDelete || pending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Delete “${item.name}”? This cannot be undone.`,
                            )
                          ) {
                            return;
                          }
                          startTransition(async () => {
                            const result = await deleteProductAction(item.id);
                            if (result.ok) router.refresh();
                            else window.alert(result.error);
                          });
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-[var(--color-muted)]">
          {total} product{total === 1 ? "" : "s"} · page {query.page} of{" "}
          {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            size="small"
            disabled={query.page <= 1}
            href={buildHref({ page: query.page - 1 }, query)}
          >
            Previous
          </Button>
          <Button
            size="small"
            disabled={query.page >= totalPages}
            href={buildHref({ page: query.page + 1 }, query)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
