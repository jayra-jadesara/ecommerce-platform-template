"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
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
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import {
  adminBtn,
  adminCard,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

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

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
] as const;

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
  if (merged.pageSize !== 10) params.set("pageSize", String(merged.pageSize));
  const qs = params.toString();
  return `${getAdminPath("/catalog/products")}${qs ? `?${qs}` : ""}`;
}

function panelHref(panel: "new" | "edit" | "view", id?: string) {
  const params = new URLSearchParams();
  params.set("panel", panel);
  if (id) params.set("id", id);
  return `${getAdminPath("/catalog/products")}?${params.toString()}`;
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
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full items-center justify-center text-[9px] font-medium uppercase tracking-wide text-[var(--color-muted)]"
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
  const [search, setSearch] = useState(query.q ?? "");
  const [deleteTarget, setDeleteTarget] = useState<AdminProductListItem | null>(
    null,
  );
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [listError, setListError] = useState<string | null>(null);

  const pageSize = query.pageSize;
  const rowsValue = pageSize === 25 ? 25 : 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (query.page - 1) * pageSize + 1;
  const rangeEnd = Math.min(query.page * pageSize, total);
  const pageItems = useMemo(
    () => buildPageItems(query.page, totalPages),
    [query.page, totalPages],
  );

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ],
    [categories],
  );

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All statuses" },
      { value: "draft", label: "Draft" },
      { value: "active", label: "Active" },
      { value: "archived", label: "Archived" },
    ],
    [],
  );

  const stockOptions = useMemo(
    () => [
      { value: "all", label: "All stock" },
      { value: "IN_STOCK", label: "In stock" },
      { value: "LOW_STOCK", label: "Low stock" },
      { value: "OUT_OF_STOCK", label: "Out of stock" },
    ],
    [],
  );

  const sortOptions = useMemo(
    () =>
      PRODUCT_SORT_OPTIONS.map((option) => ({
        value: option,
        label: sortLabels[option] ?? option,
      })),
    [],
  );

  const emptyFilters =
    !query.q &&
    !query.categoryId &&
    query.status === "all" &&
    query.featured === "all" &&
    query.stock === "all";

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(query.q) ||
    Boolean(query.categoryId) ||
    query.status !== "all" ||
    query.stock !== "all" ||
    query.sort !== "newest";

  function navigate(next: Partial<ProductListQuery>) {
    router.push(buildHref(next, query));
  }

  function commitSearch() {
    const next = search.trim();
    if (next === (query.q ?? "").trim()) return;
    navigate({ q: next, page: 1 });
  }

  function clearFilters() {
    setSearch("");
    router.push(
      buildHref(
        {
          q: "",
          categoryId: undefined,
          status: "all",
          stock: "all",
          sort: "newest",
          page: 1,
          pageSize,
        },
        query,
      ),
    );
  }

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
    <div style={adminStackStyle} className="!gap-2.5">
      {listError ? (
        <p className="text-sm text-[var(--color-error)]" role="alert">
          {listError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--color-muted)]">
          Search and filter your catalog
        </p>
        {canCreate ? (
          <Link
            href={panelHref("new")}
            className={cn(adminBtn("primary"), "!min-h-9 !px-3 !text-xs")}
          >
            + Add product
          </Link>
        ) : null}
      </div>

      <form
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          commitSearch();
        }}
      >
        <TextField
          size="small"
          fullWidth
          label="Search"
          placeholder="Product name"
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
          label="Category"
          value={query.categoryId ?? ""}
          disabled={pending}
          options={categoryOptions}
          onChange={(next) =>
            navigate({
              categoryId: next || undefined,
              page: 1,
            })
          }
        />
        <AdminSelect
          label="Status"
          value={query.status}
          disabled={pending}
          options={statusOptions}
          onChange={(next) =>
            navigate({
              status: next as ProductListQuery["status"],
              page: 1,
            })
          }
        />
        <AdminSelect
          label="Stock"
          value={query.stock}
          disabled={pending}
          options={stockOptions}
          onChange={(next) =>
            navigate({
              stock: next as ProductListQuery["stock"],
              page: 1,
            })
          }
        />
        <AdminSelect
          label="Sort"
          value={query.sort}
          disabled={pending}
          options={sortOptions}
          onChange={(next) =>
            navigate({
              sort: next as ProductListQuery["sort"],
              page: 1,
            })
          }
        />
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--color-muted)]">
          {total === 0 ? (
            <>0 products</>
          ) : (
            <>
              <span className="font-semibold text-[var(--color-foreground)]">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {total}
              </span>{" "}
              products
              <span className="mx-1.5 text-[var(--color-muted)]">|</span>
              Page{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {query.page}
              </span>
              /
              <span className="font-semibold text-[var(--color-foreground)]">
                {totalPages}
              </span>
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {total > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              <Link
                href={buildHref({ page: query.page - 1, pageSize }, query)}
                className={cn(
                  "h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs font-medium leading-8",
                  query.page <= 1 && "pointer-events-none opacity-40",
                )}
                aria-disabled={query.page <= 1}
              >
                Prev
              </Link>
              {pageItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1 text-xs text-[var(--color-muted)]"
                  >
                    …
                  </span>
                ) : (
                  <Link
                    key={item}
                    href={buildHref({ page: item, pageSize }, query)}
                    className={cn(
                      "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-medium",
                      item === query.page
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                        : "border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)]",
                    )}
                  >
                    {item}
                  </Link>
                ),
              )}
              <Link
                href={buildHref({ page: query.page + 1, pageSize }, query)}
                className={cn(
                  "h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs font-medium leading-8",
                  query.page >= totalPages && "pointer-events-none opacity-40",
                )}
                aria-disabled={query.page >= totalPages}
              >
                Next
              </Link>
            </div>
          ) : null}

          <div className="w-[6.75rem]">
            <AdminSelect
              label="Rows"
              value={String(rowsValue)}
              fullWidth
              options={PAGE_SIZE_OPTIONS}
              onChange={(value) => {
                const next = value === "25" ? 25 : 10;
                navigate({ pageSize: next, page: 1 });
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        {items.length === 0 ? (
          <EmptyState
            emptyFilters={emptyFilters}
            canCreate={canCreate}
            panelHref={panelHref("new")}
          />
        ) : (
          items.map((item) => (
            <article key={item.id} className={`${adminCard()} flex gap-3 p-3`}>
              <ProductThumb name={item.name} imageUrl={item.imageUrl} />
              <div className="min-w-0 flex-1 space-y-2">
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
                    <Chip
                      size="small"
                      label="Featured"
                      color="warning"
                      variant="outlined"
                    />
                  ) : null}
                  <div className="ml-auto flex flex-wrap items-center gap-0.5">
                    <IconButton
                      component={Link}
                      href={panelHref("view", item.id)}
                      size="small"
                      aria-label={`View ${item.name}`}
                      sx={{ color: "var(--color-muted)" }}
                    >
                      <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton
                      component={Link}
                      href={panelHref("edit", item.id)}
                      size="small"
                      aria-label={`Edit ${item.name}`}
                      disabled={!canUpdate}
                      sx={{ color: "var(--color-muted)" }}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton
                      type="button"
                      size="small"
                      aria-label={`Delete ${item.name}`}
                      disabled={!canDelete || pending}
                      onClick={() => confirmDelete(item)}
                      sx={{ color: "var(--color-error)" }}
                    >
                      <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <div className={`${adminCard()} hidden overflow-x-auto md:block`}>
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
                <td colSpan={6} className="px-4 py-12 text-center">
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
                        item.status.charAt(0).toUpperCase() +
                        item.status.slice(1)
                      }
                      variant="outlined"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-0.5">
                      <IconButton
                        component={Link}
                        href={panelHref("view", item.id)}
                        size="small"
                        aria-label={`View ${item.name}`}
                        sx={{ color: "var(--color-muted)" }}
                      >
                        <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        component={Link}
                        href={panelHref("edit", item.id)}
                        size="small"
                        aria-label={`Edit ${item.name}`}
                        disabled={!canUpdate}
                        sx={{ color: "var(--color-muted)" }}
                      >
                        <EditOutlinedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        type="button"
                        size="small"
                        aria-label={`Delete ${item.name}`}
                        disabled={!canDelete || pending}
                        onClick={() => confirmDelete(item)}
                        sx={{ color: "var(--color-error)" }}
                      >
                        <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
        onSafeAction={
          deleteBlocked && deleteTarget
            ? () => {
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
              }
            : undefined
        }
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
  return (
    <div className="mx-auto max-w-sm space-y-2 py-4">
      <p className="text-sm font-semibold text-[var(--color-foreground)]">
        {emptyFilters ? "No products yet" : "No matches"}
      </p>
      <p className="text-xs text-[var(--color-muted)]">
        {emptyFilters
          ? "Add your first product to start selling."
          : "Try a different search or clear filters."}
      </p>
      {emptyFilters && canCreate ? (
        <Link
          href={panelHref}
          className={cn(adminBtn("primary"), "!min-h-9 !px-3 !text-xs")}
        >
          + Add product
        </Link>
      ) : null}
    </div>
  );
}
