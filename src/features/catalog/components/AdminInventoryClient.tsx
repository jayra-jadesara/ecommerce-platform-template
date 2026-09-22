"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseIcon from "@mui/icons-material/Close";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { getAdminPath } from "@/config/admin-route";
import {
  adjustInventoryAction,
  bulkUpdateInventoryAction,
  exportInventoryCsvAction,
  importInventoryCsvAction,
  listInventoryMovementsAction,
  updateStoreInventoryAlertAction,
} from "@/features/catalog/actions";
import type {
  AdminInventoryProductGroup,
  AdminInventoryRow,
  InventoryListStockFilter,
  InventoryMovementRow,
  InventoryStatusCounts,
} from "@/features/catalog/inventory-types";
import {
  availableQuantity,
  deriveStockStatus,
} from "@/features/catalog/stock";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminFormDialog } from "@/features/admin/ui/AdminFormDialog";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { adminBtn, adminCard } from "@/features/admin/ui/admin-classes";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/cn";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
] as const;

const ADJUST_REASON_OPTIONS = [
  { value: "Got new stock", label: "Got new stock" },
  { value: "Weekly restock", label: "Weekly restock" },
  { value: "Damaged or spoilt", label: "Damaged or spoilt" },
  { value: "Sample / gift", label: "Sample / gift" },
  { value: "Fix wrong count", label: "Fix wrong count" },
  { value: "Other", label: "Other" },
] as const;

const DEFAULT_ADJUST_REASON = ADJUST_REASON_OPTIONS[0].value;

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
  status: AdminInventoryRow["status"],
): "success" | "warning" | "error" | "neutral" {
  switch (status) {
    case "IN_STOCK":
      return "success";
    case "LOW_STOCK":
      return "warning";
    case "OUT_OF_STOCK":
      return "error";
    default:
      return "neutral";
  }
}

function statusLabel(status: AdminInventoryRow["status"]): string {
  switch (status) {
    case "IN_STOCK":
      return "OK";
    case "LOW_STOCK":
      return "Running low";
    case "OUT_OF_STOCK":
      return "Sold out";
    default:
      return "Not counting";
  }
}

function movementLabel(type: InventoryMovementRow["movementType"]): string {
  switch (type) {
    case "SALE":
      return "Sale";
    case "RESTOCK":
      return "Restock";
    case "REVERSAL":
      return "Order cancelled / refund";
    default:
      return "Adjustment";
  }
}

function emptyFilterCopy(stock: InventoryListStockFilter): {
  title: string;
  body: string;
} {
  switch (stock) {
    case "OUT":
      return {
        title: "None sold out",
        body: "Every counted size still has stock to sell.",
      };
    case "LOW":
      return {
        title: "None running low",
        body: "No sizes are at or below your warn level.",
      };
    case "OK":
      return {
        title: "None OK right now",
        body: "Try All, or check Sold out / Running low.",
      };
    case "UNTRACKED":
      return {
        title: "All sizes are counting stock",
        body: "Turn Count stock off (Save for all) if you want unlimited sizes.",
      };
    default:
      return {
        title: "No products to show",
        body: "Add products under Products, then set stock here.",
      };
  }
}

export function AdminInventoryClient({
  initialGroups,
  total,
  page,
  pageSize,
  initialStock,
  initialSearch,
  storeLowStockThreshold,
  storeCountStock,
  statusCounts,
  highlightProductId,
  canUpdate,
}: {
  initialGroups: AdminInventoryProductGroup[];
  total: number;
  page: number;
  pageSize: number;
  initialStock: InventoryListStockFilter;
  initialSearch: string;
  storeLowStockThreshold: number;
  storeCountStock: boolean;
  statusCounts: InventoryStatusCounts;
  highlightProductId?: string | null;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(initialSearch);
  const [stock, setStock] = useState<InventoryListStockFilter>(initialStock);
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draftQty, setDraftQty] = useState<Record<string, number>>({});

  const [warnBelow, setWarnBelow] = useState(storeLowStockThreshold);
  const [countStock, setCountStock] = useState(storeCountStock);
  const [savingGlobals, setSavingGlobals] = useState(false);

  const [adjustRow, setAdjustRow] = useState<AdminInventoryRow | null>(null);
  const [adjustMode, setAdjustMode] = useState<"add" | "remove">("add");
  const [adjustDelta, setAdjustDelta] = useState("10");
  const [adjustReason, setAdjustReason] = useState(DEFAULT_ADJUST_REASON);
  const [adjustPending, setAdjustPending] = useState(false);

  const [historyRow, setHistoryRow] = useState<AdminInventoryRow | null>(null);
  const [historyItems, setHistoryItems] = useState<InventoryMovementRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const flatRows = useMemo(
    () => initialGroups.flatMap((group) => group.variants),
    [initialGroups],
  );

  useEffect(() => {
    setDraftQty({});
    setSearch(initialSearch);
    setStock(initialStock);
    setWarnBelow(storeLowStockThreshold);
    setCountStock(storeCountStock);
  }, [
    initialGroups,
    initialSearch,
    initialStock,
    storeLowStockThreshold,
    storeCountStock,
  ]);

  useEffect(() => {
    if (!highlightProductId) return;
    const el = document.getElementById(`inv-product-${highlightProductId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightProductId, initialGroups]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const pageItems = useMemo(
    () => buildPageItems(page, totalPages),
    [page, totalPages],
  );

  const dirtyRows = useMemo(() => {
    return flatRows.filter((row) => {
      const qty = draftQty[row.variantId];
      return qty !== undefined && qty !== row.quantity;
    });
  }, [draftQty, flatRows]);

  const globalsDirty =
    warnBelow !== storeLowStockThreshold || countStock !== storeCountStock;

  const chips: Array<{
    value: InventoryListStockFilter;
    label: string;
    count: number;
  }> = [
    { value: "ALL", label: "All", count: statusCounts.all },
    { value: "OUT", label: "Sold out", count: statusCounts.out },
    { value: "LOW", label: "Running low", count: statusCounts.low },
    { value: "OK", label: "OK", count: statusCounts.ok },
    {
      value: "UNTRACKED",
      label: "Not counting",
      count: statusCounts.untracked,
    },
  ];

  function qtyFor(row: AdminInventoryRow): number {
    return draftQty[row.variantId] ?? row.quantity;
  }

  function patchQty(row: AdminInventoryRow, quantity: number) {
    setDraftQty((prev) => {
      if (quantity === row.quantity) {
        const { [row.variantId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [row.variantId]: quantity };
    });
    setSuccess(null);
    setError(null);
  }

  function applyFilters(options?: {
    page?: number;
    stock?: InventoryListStockFilter;
    search?: string;
    pageSize?: number;
    product?: string | null;
  }) {
    const nextPage = options?.page ?? 1;
    const nextStock = options?.stock ?? stock;
    const nextSearch = (options?.search ?? search).trim();
    const nextPageSize = options?.pageSize ?? pageSize;
    const nextProduct =
      options && "product" in options
        ? options.product
        : highlightProductId;

    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextStock && nextStock !== "ALL") params.set("stock", nextStock);
    if (nextPageSize !== 10) params.set("pageSize", String(nextPageSize));
    if (nextPage > 1) params.set("page", String(nextPage));
    if (nextProduct) params.set("product", nextProduct);
    startTransition(() => {
      router.push(`${getAdminPath("/catalog/inventory")}?${params.toString()}`);
    });
  }

  function commitSearch() {
    const next = search.trim();
    if (next === initialSearch.trim()) return;
    applyFilters({ search: next });
  }

  function clearFilters() {
    setSearch("");
    setStock("ALL");
    applyFilters({ search: "", stock: "ALL", product: null, page: 1 });
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(initialSearch.trim()) ||
    stock !== "ALL" ||
    Boolean(highlightProductId);

  async function saveDirtyRows() {
    if (!canUpdate || dirtyRows.length === 0) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await bulkUpdateInventoryAction({
        rows: dirtyRows.map((row) => ({
          variantId: row.variantId,
          quantity: qtyFor(row),
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message);
      setDraftQty({});
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  async function saveGlobals() {
    if (!canUpdate) return;
    setSavingGlobals(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await updateStoreInventoryAlertAction({
        inventoryLowStockThreshold: warnBelow,
        countStock,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message);
      startTransition(() => router.refresh());
    } finally {
      setSavingGlobals(false);
    }
  }

  async function openHistory(row: AdminInventoryRow) {
    setHistoryRow(row);
    setHistoryLoading(true);
    setHistoryItems([]);
    try {
      const items = await listInventoryMovementsAction(row.variantId);
      setHistoryItems(items);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function submitAdjust(sign: 1 | -1) {
    if (!adjustRow || !canUpdate) return;
    const amount = Math.abs(Number(adjustDelta) || 0);
    if (!amount) {
      setError("Enter how many to add or remove.");
      return;
    }
    setAdjustPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await adjustInventoryAction({
        variantId: adjustRow.variantId,
        delta: sign * amount,
        reason: adjustReason || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message);
      setAdjustRow(null);
      setAdjustReason(DEFAULT_ADJUST_REASON);
      startTransition(() => router.refresh());
    } finally {
      setAdjustPending(false);
    }
  }

  function openAdjust(row: AdminInventoryRow, mode: "add" | "remove") {
    setAdjustRow(row);
    setAdjustMode(mode);
    setAdjustDelta("10");
    setAdjustReason(
      mode === "add" ? DEFAULT_ADJUST_REASON : "Damaged or spoilt",
    );
    setError(null);
  }

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(t);
  }, [success]);

  async function downloadCsv() {
    setError(null);
    const result = await exportInventoryCsvAction();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess("CSV downloaded.");
  }

  async function onImportFile(file: File | null) {
    if (!file || !canUpdate) return;
    setError(null);
    setSuccess(null);
    const text = await file.text();
    const result = await importInventoryCsvAction({ csv: text });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(result.message);
    startTransition(() => router.refresh());
  }

  const emptyCopy = emptyFilterCopy(stock);
  const showFilterEmpty = !initialGroups.length && (stock !== "ALL" || Boolean(initialSearch.trim()));
  const showCatalogEmpty = !initialGroups.length && !showFilterEmpty;

  const stockSelectOptions = chips.map((chip) => ({
    value: chip.value,
    label: `${chip.label} (${chip.count})`,
  }));

  return (
    <div className="w-full min-w-0 space-y-3">
      <AdminPageHeader
        title="Inventory"
        description="Edit how many stock in the grid, or use Add / Remove for restocks."
        breadcrumbs={[
          { label: "Products", href: getAdminPath("/catalog/products") },
          { label: "Inventory" },
        ]}
        actions={
          <div className="flex flex-wrap items-end justify-end gap-2.5">
            <AdminToggle
              checked={countStock}
              disabled={!canUpdate || savingGlobals || pending}
              onChange={(next) => {
                setCountStock(next);
                setSuccess(null);
                setError(null);
              }}
              label="Count stock"
            />
            <TextField
              size="small"
              type="number"
              label="Alert stock limit"
              title="Sizes at or below this number show as Running low"
              value={warnBelow}
              disabled={!canUpdate || savingGlobals || pending}
              onChange={(event) => {
                setWarnBelow(Number(event.target.value) || 0);
                setSuccess(null);
                setError(null);
              }}
              sx={{
                width: "8.75rem",
                "& .MuiInputBase-root": { minHeight: "2.25rem" },
              }}
            />
            {canUpdate ? (
              <button
                type="button"
                disabled={savingGlobals || pending || !globalsDirty}
                onClick={() => void saveGlobals()}
                className={cn(adminBtn("primary"), "!min-h-9 !px-4 !text-sm")}
              >
                {savingGlobals ? "Saving…" : "Save"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={pending}
              onClick={() => void downloadCsv()}
              className={cn(
                adminBtn("outline"),
                "!min-h-9 !gap-1.5 !px-3 !text-sm",
              )}
            >
              <DownloadIcon sx={{ fontSize: 16 }} />
              Export
            </button>
            {canUpdate ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    event.target.value = "";
                    void onImportFile(file);
                  }}
                />
                <button
                  type="button"
                  disabled={pending || dirtyRows.length > 0}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    adminBtn("outline"),
                    "!min-h-9 !gap-1.5 !px-3 !text-sm",
                  )}
                >
                  <UploadFileIcon sx={{ fontSize: 16 }} />
                  Import
                </button>
              </>
            ) : null}
          </div>
        }
      />

      <form
        className="mt-4 grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          commitSearch();
        }}
      >
        <AdminSelect
          label="Status"
          value={stock}
          disabled={pending || dirtyRows.length > 0}
          fullWidth
          options={stockSelectOptions}
          onChange={(value) => {
            const next = value as InventoryListStockFilter;
            setStock(next);
            applyFilters({ stock: next });
          }}
        />
        <TextField
          size="small"
          fullWidth
          label="Search"
          placeholder="Product, size, or SKU"
          value={search}
          disabled={pending || dirtyRows.length > 0}
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
                    disabled={pending || dirtyRows.length > 0}
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
            <>No products on this page</>
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
          {canUpdate && dirtyRows.length > 0 ? (
            <>
              <button
                type="button"
                disabled={saving || pending}
                onClick={() => {
                  setDraftQty({});
                  setError(null);
                  setSuccess(null);
                }}
                className={cn(adminBtn("ghost"), "!min-h-9 !px-3 !text-sm")}
              >
                Discard
              </button>
              <button
                type="button"
                disabled={saving || pending}
                onClick={() => void saveDirtyRows()}
                className={cn(adminBtn("primary"), "!min-h-9 !px-4 !text-sm")}
              >
                {saving ? "Saving…" : `Save stock (${dirtyRows.length})`}
              </button>
            </>
          ) : null}

          {total > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || pending || dirtyRows.length > 0}
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
                    disabled={
                      pending || item === page || dirtyRows.length > 0
                    }
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
                disabled={
                  page >= totalPages || pending || dirtyRows.length > 0
                }
                onClick={() => applyFilters({ page: page + 1 })}
                className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}

          <div className="w-[7.5rem]">
            <AdminSelect
              label="Per page"
              value={String(pageSize)}
              disabled={pending || dirtyRows.length > 0}
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

      {dirtyRows.length > 0 ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
          Unsaved stock edits — save or discard before changing filters or
          pages.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-error)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_8%,var(--color-card))] px-3 py-2 text-sm text-[var(--color-error)]">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-success)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_8%,var(--color-card))] px-3 py-2 text-sm text-[var(--color-success)]">
          {success}
        </p>
      ) : null}

      {showCatalogEmpty ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-12 text-center">
          <p className="text-sm font-semibold">{emptyCopy.title}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {emptyCopy.body}
          </p>
          <Link
            href={getAdminPath("/catalog/products?panel=new")}
            className={cn(adminBtn("primary"), "mt-4 inline-flex !min-h-9")}
          >
            Add product
          </Link>
        </div>
      ) : showFilterEmpty ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-12 text-center">
          <p className="text-sm font-semibold">{emptyCopy.title}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {emptyCopy.body}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className={cn(adminBtn("outline"), "mt-4 !min-h-9")}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className={cn(adminCard(), "overflow-x-auto")}>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3">Product / size</th>
                <th className="px-4 py-3">How many stock?</th>
                <th className="px-4 py-3">Left to sell</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialGroups.map((group) => {
                const highlighted =
                  highlightProductId === group.productId;
                return (
                  <Fragment key={group.productId}>
                    <tr
                      id={`inv-product-${group.productId}`}
                      className={cn(
                        "border-b border-[var(--color-border)] bg-[var(--color-surface)]",
                        highlighted &&
                          "bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface))]",
                      )}
                    >
                      <td colSpan={5} className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-[var(--color-foreground)]">
                              {group.productName}
                            </p>
                            {highlighted &&
                            group.variants.some(
                              (v) => v.trackInventory && v.quantity === 0,
                            ) ? (
                              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                                New product — set how many stock below, then
                                Save stock.
                              </p>
                            ) : null}
                          </div>
                          <Link
                            href={getAdminPath(
                              `/catalog/products?panel=edit&id=${group.productId}`,
                            )}
                            className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                          >
                            Edit product
                          </Link>
                        </div>
                      </td>
                    </tr>
                    {group.variants.map((row) => {
                      const quantity = qtyFor(row);
                      const dirty = quantity !== row.quantity;
                      const available = availableQuantity(
                        quantity,
                        row.reservedQuantity,
                      );
                      const liveStatus = !row.trackInventory
                        ? ("UNTRACKED" as const)
                        : deriveStockStatus({
                            quantity,
                            reservedQuantity: row.reservedQuantity,
                            lowStockThreshold: storeLowStockThreshold,
                            trackInventory: true,
                          });

                      return (
                        <tr
                          key={row.variantId}
                          className={cn(
                            "border-b border-[var(--color-border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)]",
                            dirty &&
                              "bg-[color-mix(in_srgb,var(--color-primary)_6%,transparent)]",
                          )}
                        >
                          <td className="px-4 py-3 pl-8">
                            <p className="font-medium">{row.variantName}</p>
                            {row.sku ? (
                              <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                                {row.sku}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <TextField
                              size="small"
                              type="number"
                              value={quantity}
                              disabled={
                                !canUpdate ||
                                saving ||
                                pending ||
                                !row.trackInventory
                              }
                              onChange={(event) =>
                                patchQty(
                                  row,
                                  Number(event.target.value) || 0,
                                )
                              }
                              sx={{ width: "6.5rem" }}
                            />
                            {!row.trackInventory ? (
                              <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                                Unlimited
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 font-medium tabular-nums">
                            {row.trackInventory ? available : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <AdminStatusBadge tone={statusTone(liveStatus)}>
                              {statusLabel(liveStatus)}
                            </AdminStatusBadge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {canUpdate && row.trackInventory ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={pending || dirtyRows.length > 0}
                                    title="Add stock"
                                    aria-label="Add stock"
                                    onClick={() => openAdjust(row, "add")}
                                    className={cn(
                                      adminBtn("outline"),
                                      "!min-h-8 !gap-1 !px-2.5 !text-xs",
                                    )}
                                  >
                                    <AddRoundedIcon sx={{ fontSize: 16 }} />
                                    Add
                                  </button>
                                  <button
                                    type="button"
                                    disabled={pending || dirtyRows.length > 0}
                                    title="Remove stock"
                                    aria-label="Remove stock"
                                    onClick={() => openAdjust(row, "remove")}
                                    className={cn(
                                      adminBtn("outline"),
                                      "!min-h-8 !gap-1 !px-2.5 !text-xs",
                                    )}
                                  >
                                    <RemoveRoundedIcon sx={{ fontSize: 16 }} />
                                    Remove
                                  </button>
                                </>
                              ) : null}
                              <button
                                type="button"
                                disabled={pending}
                                title="Stock history"
                                aria-label="Stock history"
                                onClick={() => void openHistory(row)}
                                className={cn(
                                  adminBtn("ghost"),
                                  "!min-h-8 !min-w-8 !px-2 !text-xs",
                                )}
                              >
                                <HistoryOutlinedIcon sx={{ fontSize: 18 }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminFormDialog
        open={Boolean(adjustRow)}
        onClose={() => !adjustPending && setAdjustRow(null)}
        onConfirm={() => setAdjustRow(null)}
        title={adjustMode === "add" ? "Add stock" : "Remove stock"}
        description={
          adjustRow
            ? `${adjustRow.productName} · ${adjustRow.variantName}`
            : undefined
        }
        pending={adjustPending}
        hideActions
        maxWidth="xs"
        contentScroll={false}
      >
        <div className="flex flex-col gap-5">
          {adjustRow ? (
            <div className="rounded-2xl bg-[var(--color-surface)] px-4 py-3 text-center">
              <p className="text-xs text-[var(--color-muted)]">Now in stock</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-[var(--color-foreground)]">
                {adjustRow.quantity}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-4">
            <TextField
              size="small"
              type="number"
              fullWidth
              label={adjustMode === "add" ? "How many to add" : "How many to remove"}
              placeholder="e.g. 10"
              value={adjustDelta}
              disabled={adjustPending}
              onChange={(event) => setAdjustDelta(event.target.value)}
            />

            <AdminSelect
              label="Why?"
              value={adjustReason}
              disabled={adjustPending}
              fullWidth
              options={[...ADJUST_REASON_OPTIONS]}
              onChange={setAdjustReason}
            />
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={adjustPending}
              className={cn(
                adminBtn(adjustMode === "add" ? "primary" : "outline"),
                "!min-h-11 !w-full !gap-2 !text-sm !font-semibold",
              )}
              onClick={() =>
                void submitAdjust(adjustMode === "add" ? 1 : -1)
              }
            >
              {adjustMode === "add" ? (
                <AddRoundedIcon sx={{ fontSize: 20 }} />
              ) : (
                <RemoveRoundedIcon sx={{ fontSize: 20 }} />
              )}
              {adjustPending
                ? "Saving…"
                : adjustMode === "add"
                  ? "Add to stock"
                  : "Take from stock"}
            </button>
            <button
              type="button"
              disabled={adjustPending}
              className={cn(
                adminBtn("ghost"),
                "!min-h-9 !w-full !text-sm text-[var(--color-muted)]",
              )}
              onClick={() => setAdjustRow(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      </AdminFormDialog>

      <AdminFormDialog
        open={Boolean(historyRow)}
        onClose={() => setHistoryRow(null)}
        onConfirm={() => setHistoryRow(null)}
        title="Stock history"
        description={
          historyRow
            ? `${historyRow.productName} · ${historyRow.variantName}`
            : undefined
        }
        hideCancel
        confirmLabel="Close"
      >
        <div className="max-h-[22rem] space-y-2 overflow-y-auto pt-1">
          {historyLoading ? (
            <p className="text-sm text-[var(--color-muted)]">Loading…</p>
          ) : !historyItems.length ? (
            <p className="text-sm text-[var(--color-muted)]">
              No movements yet. Sales and stock edits will show up here.
            </p>
          ) : (
            historyItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--color-border)] px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {movementLabel(item.movementType)}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      item.quantityDelta > 0
                        ? "text-[var(--color-success)]"
                        : "text-[var(--color-error)]",
                    )}
                  >
                    {item.quantityDelta > 0 ? "+" : ""}
                    {item.quantityDelta}
                    {item.quantityAfter != null
                      ? ` → ${item.quantityAfter}`
                      : ""}
                  </p>
                </div>
                {item.reason ? (
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    {item.reason}
                  </p>
                ) : null}
                <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                  {formatDateTime(item.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </AdminFormDialog>
    </div>
  );
}
