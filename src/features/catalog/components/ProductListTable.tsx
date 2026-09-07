"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { AdminProductListItem } from "@/features/catalog/products-service";
import type { CategoryRow } from "@/features/catalog/categories-service";
import type { ProductListQuery } from "@/features/catalog/validation";
import { PRODUCT_SORT_OPTIONS } from "@/features/catalog/validation";
import { getAdminPath } from "@/config/admin-route";

interface ProductListTableProps {
  items: AdminProductListItem[];
  total: number;
  query: ProductListQuery;
  categories: CategoryRow[];
  canCreate: boolean;
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

const stockColor: Record<string, "default" | "success" | "warning" | "error"> = {
  IN_STOCK: "success",
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "error",
};

export function ProductListTable({
  items,
  total,
  query,
  categories,
  canCreate,
}: ProductListTableProps) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <TextField
          label="Search"
          size="small"
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
          value={query.categoryId ?? ""}
          onChange={(event) =>
            router.push(
              buildHref(
                { categoryId: event.target.value || undefined, page: 1 },
                query,
              ),
            )
          }
          className="min-w-40"
        >
          <MenuItem value="">All</MenuItem>
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
          className="min-w-32"
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="archived">Archived</MenuItem>
        </TextField>
        <TextField
          select
          label="Featured"
          size="small"
          value={query.featured}
          onChange={(event) =>
            router.push(
              buildHref(
                {
                  featured: event.target.value as ProductListQuery["featured"],
                  page: 1,
                },
                query,
              ),
            )
          }
          className="min-w-32"
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="true">Featured</MenuItem>
          <MenuItem value="false">Not featured</MenuItem>
        </TextField>
        <TextField
          select
          label="Stock"
          size="small"
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
          className="min-w-36"
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
          className="min-w-36"
        >
          {PRODUCT_SORT_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <div className="ml-auto">
          <Button
            variant="contained"
            disabled={!canCreate}
            href={getAdminPath("/catalog/products/new")}
          >
            New product
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Variants</th>
              <th className="px-3 py-3">Price</th>
              <th className="px-3 py-3">Stock</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Updated</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-10 text-center text-[var(--color-muted)]"
                >
                  No products match these filters.
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
                          href={getAdminPath(`/catalog/products/${item.id}`)}
                          className="font-medium text-[var(--color-foreground)] hover:underline"
                        >
                          {item.name}
                        </Link>
                        <p className="text-xs text-[var(--color-muted)]">
                          /{item.slug}
                          {item.featured ? " · featured" : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{item.categoryName ?? "—"}</td>
                  <td className="px-3 py-3">{item.variantCount}</td>
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
                      label={item.stockStatus.replaceAll("_", " ")}
                      color={stockColor[item.stockStatus]}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Chip size="small" label={item.status} variant="outlined" />
                  </td>
                  <td className="px-3 py-3 text-xs text-[var(--color-muted)]">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    <Button
                      size="small"
                      href={getAdminPath(`/catalog/products/${item.id}`)}
                    >
                      Edit
                    </Button>
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
