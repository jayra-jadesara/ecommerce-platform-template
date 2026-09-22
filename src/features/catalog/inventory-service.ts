import "server-only";

import { z } from "zod";
import { getAdminPath } from "@/config/admin-route";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import {
  availableQuantity,
  deriveStockStatus,
} from "@/features/catalog/stock";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  CATALOG_CACHE_TAG,
  CATALOG_PRODUCTS_TAG,
  productCacheTag,
} from "@/features/catalog/cache";
import { STOREFRONT_CONFIG_CACHE_TAG } from "@/features/theme/service";
import type {
  AdminInventoryProductGroup,
  AdminInventoryRow,
  InventoryListResult,
  InventoryListStockFilter,
  InventoryMovementRow,
  InventoryStatusCounts,
} from "@/features/catalog/inventory-types";

export type {
  AdminInventoryProductGroup,
  AdminInventoryRow,
  InventoryListResult,
  InventoryListStockFilter,
  InventoryMovementRow,
  InventoryStatusCounts,
} from "@/features/catalog/inventory-types";

const INVENTORY_ROUTE = getAdminPath("/catalog/inventory");
const PRODUCTS_ROUTE = getAdminPath("/catalog/products");

const bulkRowSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0).max(1_000_000_000),
});

export const bulkInventoryUpdateSchema = z.object({
  rows: z.array(bulkRowSchema).min(1).max(200),
});

export type BulkInventoryUpdateValues = z.infer<typeof bulkInventoryUpdateSchema>;

export const storeInventoryAlertSchema = z.object({
  inventoryLowStockThreshold: z.coerce.number().int().min(0).max(1_000_000),
  countStock: z.boolean(),
});

export type StoreInventoryAlertValues = z.infer<typeof storeInventoryAlertSchema>;

export const adjustInventorySchema = z.object({
  variantId: z.string().uuid(),
  delta: z.coerce.number().int().refine((n) => n !== 0, "Change cannot be zero"),
  reason: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length ? v : undefined)),
});

export type AdjustInventoryValues = z.infer<typeof adjustInventorySchema>;

export const importInventoryCsvSchema = z.object({
  csv: z.string().min(1).max(2_000_000).optional(),
  xlsxBase64: z.string().min(1).max(8_000_000).optional(),
}).refine((v) => Boolean(v.csv || v.xlsxBase64), {
  message: "Provide a CSV or Excel file.",
});

export const exportInventorySchema = z.object({
  stock: z.enum(["ALL", "LOW", "OUT", "OK", "UNTRACKED"]).optional(),
  search: z.string().trim().max(200).optional(),
});

type CatalogResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function mapRow(input: {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  sku: string;
  trackInventory: boolean;
  quantity: number;
  reservedQuantity: number;
  /** Always the store-wide warn level (single source of truth). */
  storeLowStockThreshold: number;
}): AdminInventoryRow {
  const available = availableQuantity(input.quantity, input.reservedQuantity);
  const status = !input.trackInventory
    ? ("UNTRACKED" as const)
    : deriveStockStatus({
        quantity: input.quantity,
        reservedQuantity: input.reservedQuantity,
        lowStockThreshold: input.storeLowStockThreshold,
        trackInventory: true,
      });
  return {
    variantId: input.variantId,
    productId: input.productId,
    productName: input.productName,
    productSlug: input.productSlug,
    variantName: input.variantName,
    sku: input.sku,
    trackInventory: input.trackInventory,
    quantity: input.quantity,
    reservedQuantity: input.reservedQuantity,
    available,
    lowStockThreshold: input.storeLowStockThreshold,
    status,
  };
}

function countStatuses(rows: AdminInventoryRow[]): InventoryStatusCounts {
  const counts: InventoryStatusCounts = {
    all: rows.length,
    out: 0,
    low: 0,
    ok: 0,
    untracked: 0,
  };
  for (const row of rows) {
    if (row.status === "UNTRACKED") counts.untracked += 1;
    else if (row.status === "OUT_OF_STOCK") counts.out += 1;
    else if (row.status === "LOW_STOCK") counts.low += 1;
    else counts.ok += 1;
  }
  return counts;
}

function groupRows(mapped: AdminInventoryRow[]): AdminInventoryProductGroup[] {
  const groupOrder: string[] = [];
  const groupMap = new Map<string, AdminInventoryProductGroup>();
  for (const row of mapped) {
    let group = groupMap.get(row.productId);
    if (!group) {
      group = {
        productId: row.productId,
        productName: row.productName,
        productSlug: row.productSlug,
        variants: [],
      };
      groupMap.set(row.productId, group);
      groupOrder.push(row.productId);
    }
    group.variants.push(row);
  }
  return groupOrder.map((id) => groupMap.get(id)!);
}

function revalidateInventoryTouched(
  touchedProducts: Map<string, string>,
) {
  revalidatePath(INVENTORY_ROUTE);
  revalidatePath(PRODUCTS_ROUTE);
  revalidateTag(CATALOG_CACHE_TAG, "max");
  revalidateTag(CATALOG_PRODUCTS_TAG, "max");
  for (const [productId, slug] of touchedProducts) {
    revalidateTag(productCacheTag(productId), "max");
    if (slug) revalidateTag(productCacheTag(slug), "max");
  }
}

export async function listAdminInventory(input: {
  storeId: string | null;
  page: number;
  pageSize: number;
  search?: string;
  stock?: InventoryListStockFilter;
}): Promise<InventoryListResult> {
  const page = Math.max(1, input.page);
  const pageSize = input.pageSize === 25 ? 25 : 10;
  const emptyCounts: InventoryStatusCounts = {
    all: 0,
    out: 0,
    low: 0,
    ok: 0,
    untracked: 0,
  };
  const empty: InventoryListResult = {
    items: [],
    total: 0,
    page,
    pageSize,
    storeLowStockThreshold: 5,
    storeCountStock: true,
    statusCounts: emptyCounts,
  };
  if (!input.storeId) return empty;

  const supabase = await createSupabaseServerClient();

  const { data: settings } = await supabase
    .from("store_settings")
    .select("inventory_low_stock_threshold, inventory_count_stock")
    .eq("store_id", input.storeId)
    .maybeSingle();

  const storeLowStockThreshold =
    typeof settings?.inventory_low_stock_threshold === "number"
      ? settings.inventory_low_stock_threshold
      : 5;
  const storeCountStock =
    typeof settings?.inventory_count_stock === "boolean"
      ? settings.inventory_count_stock
      : true;

  const { data: variantRows, error } = await supabase
    .from("product_variants")
    .select(
      `
      id,
      name,
      sku,
      track_inventory,
      is_active,
      product_id,
      products!inner ( id, name, slug, store_id, status ),
      inventory ( quantity, reserved_quantity, low_stock_threshold )
    `,
    )
    .eq("products.store_id", input.storeId)
    .neq("products.status", "archived")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return empty;
  }

  const search = (input.search ?? "").trim().toLowerCase();
  const stockFilter = input.stock ?? "ALL";

  let mapped: AdminInventoryRow[] = (variantRows ?? []).map((row) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    const invRaw = row.inventory;
    const inv = Array.isArray(invRaw) ? invRaw[0] : invRaw;
    return mapRow({
      variantId: row.id,
      productId: product?.id ?? row.product_id,
      productName: product?.name ?? "Product",
      productSlug: product?.slug ?? "",
      variantName: row.name,
      sku: row.sku ?? "",
      trackInventory: Boolean(row.track_inventory),
      quantity: inv?.quantity ?? 0,
      reservedQuantity: inv?.reserved_quantity ?? 0,
      storeLowStockThreshold,
    });
  });

  if (search) {
    mapped = mapped.filter((row) => {
      const hay = `${row.productName} ${row.variantName} ${row.sku}`.toLowerCase();
      return hay.includes(search);
    });
  }

  const statusCounts = countStatuses(mapped);

  if (stockFilter !== "ALL") {
    mapped = mapped.filter((row) => {
      if (stockFilter === "UNTRACKED") return row.status === "UNTRACKED";
      if (stockFilter === "OUT") return row.status === "OUT_OF_STOCK";
      if (stockFilter === "LOW") return row.status === "LOW_STOCK";
      if (stockFilter === "OK") return row.status === "IN_STOCK";
      return true;
    });
  }

  mapped.sort((a, b) => {
    const byProduct = a.productName.localeCompare(b.productName);
    if (byProduct !== 0) return byProduct;
    return a.variantName.localeCompare(b.variantName);
  });

  const groups = groupRows(mapped);
  const total = groups.length;
  const start = (page - 1) * pageSize;
  const items = groups.slice(start, start + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    storeLowStockThreshold,
    storeCountStock,
    statusCounts,
  };
}

export async function bulkUpdateInventory(
  input: unknown,
): Promise<CatalogResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "inventory.update")) {
    return { ok: false, error: "You do not have permission to update inventory." };
  }

  const parsed = bulkInventoryUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid inventory updates.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return {
      ok: false,
      error:
        "Your store isn't ready yet. Open Store Settings and finish setup, then try saving again.",
    };
  }

  const { data: settings } = await supabase
    .from("store_settings")
    .select("inventory_low_stock_threshold")
    .eq("store_id", storeId)
    .maybeSingle();
  const storeThreshold =
    typeof settings?.inventory_low_stock_threshold === "number"
      ? settings.inventory_low_stock_threshold
      : 5;

  const rows = parsed.data.rows;
  const variantIds = rows.map((r) => r.variantId);

  const { data: existing, error: loadErr } = await supabase
    .from("product_variants")
    .select(
      "id, product_id, track_inventory, products!inner(store_id, slug), inventory(quantity, reserved_quantity, low_stock_threshold)",
    )
    .in("id", variantIds)
    .eq("products.store_id", storeId);

  if (loadErr) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "BULK_UPDATE_INVENTORY",
      feature: "PRODUCTS",
      message: "Unable to load inventory rows",
      error: loadErr,
      databaseCode: loadErr.code,
      storeId,
      entityType: "inventory",
      entityId: storeId,
      route: INVENTORY_ROUTE,
    });
  }

  const byId = new Map((existing ?? []).map((row) => [row.id, row]));
  const touchedProducts = new Map<string, string>();
  const movements: Array<{
    store_id: string;
    variant_id: string;
    movement_type: "ADJUSTMENT";
    quantity_delta: number;
    quantity_after: number;
    reason: string;
    created_by: string;
  }> = [];

  for (const row of rows) {
    const current = byId.get(row.variantId);
    if (!current) {
      return { ok: false, error: "One or more variants were not found for this store." };
    }

    const product = Array.isArray(current.products)
      ? current.products[0]
      : current.products;
    if (!product) {
      return { ok: false, error: "One or more variants were not found for this store." };
    }

    const invRaw = current.inventory;
    const inv = Array.isArray(invRaw) ? invRaw[0] : invRaw;
    const reserved = inv?.reserved_quantity ?? 0;
    const previousQty = inv?.quantity ?? 0;

    if (reserved > row.quantity) {
      return {
        ok: false,
        error: `Cannot set stock below units already held (${reserved}).`,
      };
    }

    const { error: invErr } = await supabase.from("inventory").upsert({
      variant_id: row.variantId,
      quantity: row.quantity,
      reserved_quantity: reserved,
      low_stock_threshold: storeThreshold,
    });

    if (invErr) {
      return unexpectedFailure({
        type: "DATABASE",
        source: "DATABASE",
        operation: "BULK_UPDATE_INVENTORY",
        feature: "PRODUCTS",
        message: "Unable to update inventory",
        error: invErr,
        databaseCode: invErr.code,
        storeId,
        entityType: "inventory",
        entityId: row.variantId,
        route: INVENTORY_ROUTE,
      });
    }

    const delta = row.quantity - previousQty;
    if (delta !== 0) {
      movements.push({
        store_id: storeId,
        variant_id: row.variantId,
        movement_type: "ADJUSTMENT",
        quantity_delta: delta,
        quantity_after: row.quantity,
        reason: "Admin set quantity",
        created_by: admin.user.id,
      });
    }

    touchedProducts.set(current.product_id, product.slug);
  }

  if (movements.length) {
    const { error: moveErr } = await supabase
      .from("inventory_movements")
      .insert(movements);
    if (moveErr) {
      return unexpectedFailure({
        type: "DATABASE",
        source: "DATABASE",
        operation: "BULK_UPDATE_INVENTORY",
        feature: "PRODUCTS",
        message: "Unable to save stock history",
        error: moveErr,
        databaseCode: moveErr.code,
        storeId,
        entityType: "inventory_movements",
        entityId: storeId,
        route: INVENTORY_ROUTE,
      });
    }
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "INVENTORY_BULK_UPDATED",
    entity_type: "inventory",
    entity_id: storeId,
    metadata: {
      updated_count: rows.length,
      variant_ids: variantIds,
    },
  });

  revalidateInventoryTouched(touchedProducts);

  return {
    ok: true,
    message: `Saved stock for ${rows.length} size/pack(s).`,
  };
}

export async function adjustInventory(input: unknown): Promise<CatalogResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "inventory.update")) {
    return { ok: false, error: "You do not have permission to update inventory." };
  }

  const parsed = adjustInventorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid stock change.",
    };
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return {
      ok: false,
      error:
        "Your store isn't ready yet. Open Store Settings and finish setup, then try saving again.",
    };
  }

  const { data: settings } = await supabase
    .from("store_settings")
    .select("inventory_low_stock_threshold")
    .eq("store_id", storeId)
    .maybeSingle();
  const storeThreshold =
    typeof settings?.inventory_low_stock_threshold === "number"
      ? settings.inventory_low_stock_threshold
      : 5;

  const { data: variant, error: loadErr } = await supabase
    .from("product_variants")
    .select(
      "id, product_id, track_inventory, products!inner(store_id, slug), inventory(quantity, reserved_quantity)",
    )
    .eq("id", values.variantId)
    .eq("products.store_id", storeId)
    .maybeSingle();

  if (loadErr || !variant) {
    return { ok: false, error: "Size/pack not found for this store." };
  }

  if (!variant.track_inventory) {
    return { ok: false, error: "This size is not counting stock." };
  }

  const product = Array.isArray(variant.products)
    ? variant.products[0]
    : variant.products;
  if (!product) {
    return { ok: false, error: "Size/pack not found for this store." };
  }

  const invRaw = variant.inventory;
  const inv = Array.isArray(invRaw) ? invRaw[0] : invRaw;
  const previousQty = inv?.quantity ?? 0;
  const reserved = inv?.reserved_quantity ?? 0;
  const nextQty = previousQty + values.delta;

  if (nextQty < 0) {
    return { ok: false, error: "Stock cannot go below zero." };
  }
  if (nextQty < reserved) {
    return {
      ok: false,
      error: `Cannot go below units already held (${reserved}).`,
    };
  }

  const { error: invErr } = await supabase.from("inventory").upsert({
    variant_id: values.variantId,
    quantity: nextQty,
    reserved_quantity: reserved,
    low_stock_threshold: storeThreshold,
  });

  if (invErr) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "ADJUST_INVENTORY",
      feature: "PRODUCTS",
      message: "Unable to adjust inventory",
      error: invErr,
      databaseCode: invErr.code,
      storeId,
      entityType: "inventory",
      entityId: values.variantId,
      route: INVENTORY_ROUTE,
    });
  }

  const movementType = values.delta > 0 ? "RESTOCK" : "ADJUSTMENT";
  const { error: moveErr } = await supabase.from("inventory_movements").insert({
    store_id: storeId,
    variant_id: values.variantId,
    movement_type: movementType,
    quantity_delta: values.delta,
    quantity_after: nextQty,
    reason: values.reason ?? (values.delta > 0 ? "Restock" : "Adjustment"),
    created_by: admin.user.id,
  });

  if (moveErr) {
    await supabase.from("inventory").upsert({
      variant_id: values.variantId,
      quantity: previousQty,
      reserved_quantity: reserved,
      low_stock_threshold: storeThreshold,
    });
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "ADJUST_INVENTORY",
      feature: "PRODUCTS",
      message: "Unable to save stock history",
      error: moveErr,
      databaseCode: moveErr.code,
      storeId,
      entityType: "inventory_movements",
      entityId: values.variantId,
      route: INVENTORY_ROUTE,
    });
  }

  revalidateInventoryTouched(
    new Map([[variant.product_id, product.slug]]),
  );

  return {
    ok: true,
    message:
      values.delta > 0
        ? `Added ${values.delta}. Now ${nextQty}.`
        : `Removed ${Math.abs(values.delta)}. Now ${nextQty}.`,
  };
}

export async function listInventoryMovements(input: {
  variantId: string;
  limit?: number;
}): Promise<InventoryMovementRow[]> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "inventory.view")) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return [];

  const limit = Math.min(50, Math.max(1, input.limit ?? 30));

  const { data, error } = await supabase
    .from("inventory_movements")
    .select(
      "id, movement_type, quantity_delta, quantity_after, reason, created_at, store_id",
    )
    .eq("variant_id", input.variantId)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    movementType: row.movement_type,
    quantityDelta: row.quantity_delta,
    quantityAfter: row.quantity_after,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

export async function exportInventoryExcel(
  input: unknown = {},
): Promise<
  | { ok: true; base64: string; filename: string; mime: string }
  | { ok: false; error: string }
> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "inventory.view")) {
    return { ok: false, error: "You do not have permission to export inventory." };
  }

  const parsed = exportInventorySchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, error: "Invalid export filters." };
  }

  const stockFilter = parsed.data.stock ?? "ALL";
  const search = (parsed.data.search ?? "").trim().toLowerCase();

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return { ok: false, error: "Store not ready." };
  }

  const { data: settings } = await supabase
    .from("store_settings")
    .select("inventory_low_stock_threshold")
    .eq("store_id", storeId)
    .maybeSingle();
  const storeLowStockThreshold =
    typeof settings?.inventory_low_stock_threshold === "number"
      ? settings.inventory_low_stock_threshold
      : 5;

  const { data: variantRows, error } = await supabase
    .from("product_variants")
    .select(
      `
      id, name, sku, track_inventory, product_id,
      products!inner ( id, name, slug, store_id, status ),
      inventory ( quantity, reserved_quantity )
    `,
    )
    .eq("products.store_id", storeId)
    .neq("products.status", "archived")
    .eq("is_active", true);

  if (error) {
    return { ok: false, error: "Unable to load inventory for export." };
  }

  let rows = (variantRows ?? []).map((row) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    const invRaw = row.inventory;
    const inv = Array.isArray(invRaw) ? invRaw[0] : invRaw;
    return mapRow({
      variantId: row.id,
      productId: product?.id ?? row.product_id,
      productName: product?.name ?? "Product",
      productSlug: product?.slug ?? "",
      variantName: row.name,
      sku: row.sku ?? "",
      trackInventory: Boolean(row.track_inventory),
      quantity: inv?.quantity ?? 0,
      reservedQuantity: inv?.reserved_quantity ?? 0,
      storeLowStockThreshold,
    });
  });

  if (search) {
    rows = rows.filter((row) => {
      const hay = `${row.productName} ${row.variantName} ${row.sku}`.toLowerCase();
      return hay.includes(search);
    });
  }

  if (stockFilter !== "ALL") {
    rows = rows.filter((row) => {
      if (stockFilter === "UNTRACKED") return row.status === "UNTRACKED";
      if (stockFilter === "OUT") return row.status === "OUT_OF_STOCK";
      if (stockFilter === "LOW") return row.status === "LOW_STOCK";
      if (stockFilter === "OK") return row.status === "IN_STOCK";
      return true;
    });
  }

  rows.sort((a, b) => {
    const byProduct = a.productName.localeCompare(b.productName);
    if (byProduct !== 0) return byProduct;
    return a.variantName.localeCompare(b.variantName);
  });

  const [{ getStoreBranding, getStoreTheme }, { buildInventoryWorkbook }] =
    await Promise.all([
      import("@/features/theme/service"),
      import("@/features/catalog/inventory-excel"),
    ]);

  const [brand, theme] = await Promise.all([
    getStoreBranding(),
    getStoreTheme(),
  ]);
  const colors = theme.light;

  const stockLabel =
    stockFilter === "ALL"
      ? "All"
      : stockFilter === "OUT"
        ? "Sold out"
        : stockFilter === "LOW"
          ? "Running low"
          : stockFilter === "OK"
            ? "OK"
            : "Not counting";
  const filterLabel = search
    ? `Status ${stockLabel}; Search “${parsed.data.search?.trim()}”`
    : `Status ${stockLabel}`;

  const buffer = await buildInventoryWorkbook({
    rows,
    theme: {
      brandName: brand.name || "Store",
      primary: colors.primary,
      foreground: colors.foreground,
      muted: colors.muted,
      surface: colors.surface,
      card: colors.card,
      border: colors.border,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
    },
    filterLabel,
    alertStockLimit: storeLowStockThreshold,
    exportedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
  });

  const base64 = Buffer.from(buffer).toString("base64");
  const slug = (brand.name || "inventory")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const day = new Date().toISOString().slice(0, 10);

  return {
    ok: true,
    base64,
    filename: `${slug || "inventory"}-stock-${day}.xlsx`,
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

export async function importInventoryCsv(
  input: unknown,
): Promise<CatalogResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "inventory.update")) {
    return { ok: false, error: "You do not have permission to import inventory." };
  }

  const parsed = importInventoryCsvSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid file. Upload the Excel Export or a CSV with sku + how_many." };
  }

  let updates: Array<{ sku: string; quantity: number }> = [];

  if (parsed.data.xlsxBase64) {
    const { extractInventoryUpdatesFromXlsx } = await import(
      "@/features/catalog/inventory-excel"
    );
    const binary = Buffer.from(parsed.data.xlsxBase64, "base64");
    const extracted = await extractInventoryUpdatesFromXlsx(
      binary.buffer.slice(
        binary.byteOffset,
        binary.byteOffset + binary.byteLength,
      ),
    );
    if ("error" in extracted) {
      return { ok: false, error: extracted.error };
    }
    updates = extracted;
  } else {
    const lines = (parsed.data.csv ?? "")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return { ok: false, error: "CSV needs a header row and at least one data row." };
    }

    const header = lines[0]!
      .toLowerCase()
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));
    const skuIdx = header.findIndex((h) => h === "sku");
    const qtyIdx = header.findIndex(
      (h) => h === "how_many" || h === "quantity" || h === "qty",
    );
    if (skuIdx < 0 || qtyIdx < 0) {
      return {
        ok: false,
        error: "CSV must include sku and how_many (or quantity) columns.",
      };
    }

    function parseCsvLine(line: string): string[] {
      const out: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i]!;
        if (inQuotes) {
          if (ch === '"' && line[i + 1] === '"') {
            cur += '"';
            i += 1;
          } else if (ch === '"') {
            inQuotes = false;
          } else {
            cur += ch;
          }
        } else if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          out.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out;
    }

    for (const line of lines.slice(1)) {
      const cols = parseCsvLine(line);
      const sku = (cols[skuIdx] ?? "").trim();
      const qtyRaw = (cols[qtyIdx] ?? "").trim();
      if (!sku) continue;
      const quantity = Number(qtyRaw);
      if (
        !Number.isFinite(quantity) ||
        quantity < 0 ||
        !Number.isInteger(quantity)
      ) {
        return { ok: false, error: `Invalid quantity for SKU ${sku}.` };
      }
      updates.push({ sku, quantity });
    }
  }

  if (!updates.length) {
    return { ok: false, error: "No rows to import." };
  }
  if (updates.length > 500) {
    return { ok: false, error: "Import is limited to 500 rows at a time." };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return {
      ok: false,
      error:
        "Your store isn't ready yet. Open Store Settings and finish setup, then try saving again.",
    };
  }

  const skus = updates.map((u) => u.sku);
  const { data: variants, error: loadErr } = await supabase
    .from("product_variants")
    .select("id, sku, products!inner(store_id)")
    .eq("products.store_id", storeId)
    .in("sku", skus);

  if (loadErr) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "IMPORT_INVENTORY_CSV",
      feature: "PRODUCTS",
      message: "Unable to match SKUs",
      error: loadErr,
      databaseCode: loadErr.code,
      storeId,
      entityType: "product_variants",
      entityId: storeId,
      route: INVENTORY_ROUTE,
    });
  }

  const bySku = new Map(
    (variants ?? []).map((v) => [v.sku, v.id] as const),
  );
  const missing = updates.filter((u) => !bySku.has(u.sku)).map((u) => u.sku);
  if (missing.length) {
    return {
      ok: false,
      error: `Unknown SKU(s): ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`,
    };
  }

  const bulkRows = updates.map((u) => ({
    variantId: bySku.get(u.sku)!,
    quantity: u.quantity,
  }));

  return bulkUpdateInventory({ rows: bulkRows });
}

export async function updateStoreInventoryAlert(
  input: unknown,
): Promise<CatalogResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "inventory.update")) {
    return { ok: false, error: "You do not have permission to update inventory." };
  }

  const parsed = storeInventoryAlertSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid alert level.",
    };
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return {
      ok: false,
      error:
        "Your store isn't ready yet. Open Store Settings and finish setup, then try saving again.",
    };
  }

  const { data: existing } = await supabase
    .from("store_settings")
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();

  const settingsPayload = {
    inventory_low_stock_threshold: values.inventoryLowStockThreshold,
    inventory_count_stock: values.countStock,
  };

  const settingsWrite = existing
    ? await supabase
        .from("store_settings")
        .update(settingsPayload)
        .eq("store_id", storeId)
    : await supabase.from("store_settings").insert({
        store_id: storeId,
        ...settingsPayload,
      });

  if (settingsWrite.error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "STORE_INVENTORY_ALERT",
      feature: "SETTINGS",
      message: "Unable to save store inventory defaults",
      error: settingsWrite.error,
      databaseCode: settingsWrite.error.code,
      storeId,
      entityType: "store_settings",
      entityId: storeId,
      route: INVENTORY_ROUTE,
    });
  }

  let appliedCount = 0;
  const { data: variantRows, error: variantErr } = await supabase
    .from("product_variants")
    .select("id, products!inner(store_id)")
    .eq("products.store_id", storeId);

  if (variantErr) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "STORE_INVENTORY_ALERT",
      feature: "SETTINGS",
      message: "Unable to load products for inventory defaults",
      error: variantErr,
      databaseCode: variantErr.code,
      storeId,
      entityType: "product_variants",
      entityId: storeId,
      route: INVENTORY_ROUTE,
    });
  }

  const ids = (variantRows ?? []).map((r) => r.id);
  if (ids.length) {
    const { error: trackErr } = await supabase
      .from("product_variants")
      .update({ track_inventory: values.countStock })
      .in("id", ids);

    if (trackErr) {
      return unexpectedFailure({
        type: "DATABASE",
        source: "DATABASE",
        operation: "STORE_INVENTORY_ALERT",
        feature: "SETTINGS",
        message: "Unable to apply count-stock to all products",
        error: trackErr,
        databaseCode: trackErr.code,
        storeId,
        entityType: "product_variants",
        entityId: storeId,
        route: INVENTORY_ROUTE,
      });
    }

    const { error: invErr, count } = await supabase
      .from("inventory")
      .update(
        { low_stock_threshold: values.inventoryLowStockThreshold },
        { count: "exact" },
      )
      .in("variant_id", ids);

    if (invErr) {
      return unexpectedFailure({
        type: "DATABASE",
        source: "DATABASE",
        operation: "STORE_INVENTORY_ALERT",
        feature: "SETTINGS",
        message: "Unable to apply warn level to all products",
        error: invErr,
        databaseCode: invErr.code,
        storeId,
        entityType: "inventory",
        entityId: storeId,
        route: INVENTORY_ROUTE,
      });
    }
    appliedCount = count ?? ids.length;
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "STORE_INVENTORY_ALERT_UPDATED",
    entity_type: "store_settings",
    entity_id: storeId,
    metadata: {
      inventory_low_stock_threshold: values.inventoryLowStockThreshold,
      count_stock: values.countStock,
      inventory_rows_updated: appliedCount,
    },
  });

  revalidatePath(INVENTORY_ROUTE);
  revalidateTag(STOREFRONT_CONFIG_CACHE_TAG, "max");
  revalidateTag(CATALOG_CACHE_TAG, "max");
  revalidateTag(CATALOG_PRODUCTS_TAG, "max");

  return {
    ok: true,
    message: `Saved for all ${appliedCount} size(s): warn below ${values.inventoryLowStockThreshold}, count stock ${values.countStock ? "on" : "off"}.`,
  };
}
