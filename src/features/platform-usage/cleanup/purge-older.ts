import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { REPLACE_PHOTOS_BUCKET } from "@/features/platform-usage/cleanup/keep-wipe";
import { removeStoragePaths } from "@/features/platform-usage/cleanup/storage-delete";
import {
  formatRetentionCutoff,
  retentionCutoffIso,
  retentionLabel,
  type RetentionMonths,
} from "@/features/platform-usage/cleanup/retention";
import type {
  CleanupPreview,
  CleanupResult,
  CleanupTableCount,
} from "@/features/platform-usage/cleanup/types";

const ID_CHUNK = 80;

async function fetchOldOrderIds(cutoffIso: string): Promise<string[]> {
  const supabase = createSupabaseServiceClient();
  const ids: string[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("orders")
      .select("id")
      .lt("created_at", cutoffIso)
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`Failed to list old orders: ${error.message}`);
    if (!data?.length) break;
    for (const row of data) ids.push(row.id);
    if (data.length < 1000) break;
    from += 1000;
  }
  return ids;
}

async function countOlder(
  table:
    | "orders"
    | "payments"
    | "order_replace_requests"
    | "order_activities"
    | "audit_logs"
    | "error_logs"
    | "storefront_sync_events"
    | "inventory_movements",
  cutoffIso: string,
): Promise<number> {
  const supabase = createSupabaseServiceClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .lt("created_at", cutoffIso);
  if (error) {
    console.error(`[retention] count ${table}:`, error.message);
    return 0;
  }
  return count ?? 0;
}

async function countWebhookOlder(cutoffIso: string): Promise<number> {
  const supabase = createSupabaseServiceClient();
  const { count, error } = await supabase
    .from("payment_webhook_events")
    .select("*", { count: "exact", head: true })
    .lt("received_at", cutoffIso);
  if (error) {
    console.error(`[retention] count payment_webhook_events:`, error.message);
    return 0;
  }
  return count ?? 0;
}

export async function previewPurgeOlderThan(
  months: RetentionMonths,
): Promise<CleanupPreview> {
  const cutoffIso = retentionCutoffIso(months);
  const orderIds = await fetchOldOrderIds(cutoffIso);

  const tables: CleanupTableCount[] = [
    {
      table: "orders",
      label: "Orders",
      count: orderIds.length,
    },
    {
      table: "payments",
      label: "Payments (by date)",
      count: await countOlder("payments", cutoffIso),
    },
    {
      table: "order_replace_requests",
      label: "Replace requests (by date)",
      count: await countOlder("order_replace_requests", cutoffIso),
    },
    {
      table: "order_activities",
      label: "Order activity (by date)",
      count: await countOlder("order_activities", cutoffIso),
    },
    {
      table: "audit_logs",
      label: "Audit logs",
      count: await countOlder("audit_logs", cutoffIso),
    },
    {
      table: "error_logs",
      label: "Error logs",
      count: await countOlder("error_logs", cutoffIso),
    },
    {
      table: "storefront_sync_events",
      label: "Sync events",
      count: await countOlder("storefront_sync_events", cutoffIso),
    },
    {
      table: "inventory_movements",
      label: "Inventory movements (by date)",
      count: await countOlder("inventory_movements", cutoffIso),
    },
    {
      table: "payment_webhook_events",
      label: "Payment webhooks (by date)",
      count: await countWebhookOlder(cutoffIso),
    },
  ];

  return {
    action: "purge_older_than",
    title: "Delete older data",
    description: `${retentionLabel(months)}. Everything before ${formatRetentionCutoff(cutoffIso)} will be removed from orders, payments, activity, and replace photos.`,
    confirmPhrase: "CLEAR",
    tables,
    storageBuckets: [
      { bucket: REPLACE_PHOTOS_BUCKET, label: "replacements (old photos)" },
    ],
    retentionMonths: months,
    cutoffIso,
    notes: [
      "Rolling window from today — not calendar year. In January you still keep a full retention period of history.",
      "Catalog, customers, branding, payment settings, and team are never deleted.",
      "Related order lines, payments, webhooks, and replace photos for old orders are removed together.",
    ],
  };
}

async function deleteInIdChunks(
  table:
    | "order_replace_requests"
    | "order_activities"
    | "payment_webhook_events"
    | "payments"
    | "coupon_redemptions"
    | "order_items"
    | "inventory_movements"
    | "orders",
  column: "order_id" | "id",
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const supabase = createSupabaseServiceClient();
  let total = 0;
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const chunk = ids.slice(i, i + ID_CHUNK);
    const { count, error } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .in(column, chunk);
    if (error) {
      throw new Error(`Failed deleting ${table}: ${error.message}`);
    }
    total += count ?? 0;
  }
  return total;
}

async function deleteOlderByDate(
  table:
    | "audit_logs"
    | "error_logs"
    | "storefront_sync_events"
    | "inventory_movements"
    | "order_activities"
    | "payments"
    | "order_replace_requests",
  cutoffIso: string,
): Promise<number> {
  const supabase = createSupabaseServiceClient();
  const { count, error } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .lt("created_at", cutoffIso);
  if (error) {
    throw new Error(`Failed deleting old ${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function deleteOlderWebhooks(cutoffIso: string): Promise<number> {
  const supabase = createSupabaseServiceClient();
  const { count, error } = await supabase
    .from("payment_webhook_events")
    .delete({ count: "exact" })
    .lt("received_at", cutoffIso);
  if (error) {
    throw new Error(
      `Failed deleting old payment_webhook_events: ${error.message}`,
    );
  }
  return count ?? 0;
}

export async function executePurgeOlderThan(input: {
  months: RetentionMonths;
  userId: string;
  storeId: string | null;
}): Promise<CleanupResult> {
  const { months, userId, storeId } = input;
  const cutoffIso = retentionCutoffIso(months);
  const supabase = createSupabaseServiceClient();
  const warnings: string[] = [];
  const deletedRows: Record<string, number> = {};

  const orderIds = await fetchOldOrderIds(cutoffIso);

  // Collect replace photos for old orders before deleting rows.
  let deletedFiles = 0;
  if (orderIds.length > 0) {
    const photoPaths: string[] = [];
    for (let i = 0; i < orderIds.length; i += ID_CHUNK) {
      const chunk = orderIds.slice(i, i + ID_CHUNK);
      const { data } = await supabase
        .from("order_replace_requests")
        .select("photo_storage_path")
        .in("order_id", chunk)
        .not("photo_storage_path", "is", null);
      for (const row of data ?? []) {
        if (row.photo_storage_path) photoPaths.push(row.photo_storage_path);
      }
    }
    if (photoPaths.length > 0) {
      const removed = await removeStoragePaths(
        supabase,
        REPLACE_PHOTOS_BUCKET,
        photoPaths,
      );
      deletedFiles += removed.removed;
      warnings.push(...removed.errors);
    }

    deletedRows.order_replace_requests = await deleteInIdChunks(
      "order_replace_requests",
      "order_id",
      orderIds,
    );
    deletedRows.order_activities = await deleteInIdChunks(
      "order_activities",
      "order_id",
      orderIds,
    );
    deletedRows.inventory_movements_order = await deleteInIdChunks(
      "inventory_movements",
      "order_id",
      orderIds,
    );
    deletedRows.payment_webhook_events = await deleteInIdChunks(
      "payment_webhook_events",
      "order_id",
      orderIds,
    );
    deletedRows.payments = await deleteInIdChunks(
      "payments",
      "order_id",
      orderIds,
    );
    deletedRows.coupon_redemptions = await deleteInIdChunks(
      "coupon_redemptions",
      "order_id",
      orderIds,
    );
    deletedRows.order_items = await deleteInIdChunks(
      "order_items",
      "order_id",
      orderIds,
    );
    deletedRows.orders = await deleteInIdChunks("orders", "id", orderIds);
  }

  // Age-based leftovers (rows not tied to remaining orders / orphan dated rows).
  deletedRows.audit_logs = await deleteOlderByDate("audit_logs", cutoffIso);
  deletedRows.error_logs = await deleteOlderByDate("error_logs", cutoffIso);
  deletedRows.storefront_sync_events = await deleteOlderByDate(
    "storefront_sync_events",
    cutoffIso,
  );
  deletedRows.inventory_movements_dated = await deleteOlderByDate(
    "inventory_movements",
    cutoffIso,
  );

  // Replace photos on any remaining old-dated requests (edge cases).
  const { data: oldReplace } = await supabase
    .from("order_replace_requests")
    .select("photo_storage_path")
    .lt("created_at", cutoffIso)
    .not("photo_storage_path", "is", null);
  const leftoverPaths = (oldReplace ?? [])
    .map((r) => r.photo_storage_path)
    .filter((p): p is string => Boolean(p));
  if (leftoverPaths.length > 0) {
    const removed = await removeStoragePaths(
      supabase,
      REPLACE_PHOTOS_BUCKET,
      leftoverPaths,
    );
    deletedFiles += removed.removed;
    warnings.push(...removed.errors);
  }
  deletedRows.order_replace_requests_dated = await deleteOlderByDate(
    "order_replace_requests",
    cutoffIso,
  );
  deletedRows.order_activities_dated = await deleteOlderByDate(
    "order_activities",
    cutoffIso,
  );
  deletedRows.payments_dated = await deleteOlderByDate("payments", cutoffIso);
  deletedRows.payment_webhook_events_dated =
    await deleteOlderWebhooks(cutoffIso);

  try {
    await supabase.from("audit_logs").insert({
      store_id: storeId,
      user_id: userId,
      action: "CLEANUP_PURGE_OLDER_THAN",
      entity_type: "platform_cleanup",
      entity_id: null,
      metadata: {
        phase: "completed",
        months,
        cutoffIso,
        deletedRows,
        deletedFiles,
      },
    });
  } catch {
    /* ignore */
  }

  return {
    ok: true,
    action: "purge_older_than",
    deletedRows,
    deletedFiles,
    retentionMonths: months,
    cutoffIso,
    warnings: warnings.length ? warnings : undefined,
    message: `Deleted data older than ${formatRetentionCutoff(cutoffIso)} (${retentionLabel(months).toLowerCase()}).`,
  };
}
