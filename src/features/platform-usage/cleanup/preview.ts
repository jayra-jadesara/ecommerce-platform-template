import "server-only";

import {
  ACTION_META,
  CLEAR_ACTIVITY_TABLE_ORDER,
  CLEAR_ORDERS_TABLE_ORDER,
  CONFIRM_PHRASES,
  FORMAT_RESET_STORAGE_BUCKETS,
  FORMAT_RESET_TABLE_ORDER,
  REPLACE_PHOTOS_BUCKET,
  TABLE_LABELS,
  type PublicTable,
  assertWipeSafe,
} from "@/features/platform-usage/cleanup/keep-wipe";
import { countTableRows } from "@/features/platform-usage/cleanup/db";
import type {
  CleanupActionId,
  CleanupPreview,
  CleanupTableCount,
} from "@/features/platform-usage/cleanup/types";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

async function countsForTables(
  tables: readonly PublicTable[],
): Promise<CleanupTableCount[]> {
  assertWipeSafe(tables);
  const supabase = createSupabaseServiceClient();
  const out: CleanupTableCount[] = [];
  for (const table of tables) {
    const count = await countTableRows(supabase, table);
    out.push({
      table,
      label: TABLE_LABELS[table] ?? table,
      count,
    });
  }
  return out;
}

export async function previewCleanup(
  action: CleanupActionId,
): Promise<CleanupPreview> {
  const meta = ACTION_META[action];
  const confirmPhrase = CONFIRM_PHRASES[action];

  if (action === "format_reset") {
    const tables = await countsForTables(FORMAT_RESET_TABLE_ORDER);
    const supabase = createSupabaseServiceClient();
    const { count: shopperHint } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true });
    const { count: adminCount } = await supabase
      .from("admin_users")
      .select("*", { count: "exact", head: true });

    return {
      action,
      title: meta.title,
      description: meta.description,
      confirmPhrase,
      tables,
      storageBuckets: FORMAT_RESET_STORAGE_BUCKETS.map((bucket) => ({
        bucket,
        label: bucket,
      })),
      notes: [
        `Approx. ${Math.max(0, (shopperHint ?? 0) - (adminCount ?? 0))} shopper accounts may be removed (staff kept).`,
        "Branding files and store/payment settings are kept.",
        "Table structure and system roles are never dropped.",
      ],
    };
  }

  if (action === "clear_orders_payments") {
    return {
      action,
      title: meta.title,
      description: meta.description,
      confirmPhrase,
      tables: await countsForTables(CLEAR_ORDERS_TABLE_ORDER),
      storageBuckets: [
        { bucket: REPLACE_PHOTOS_BUCKET, label: "replacements" },
      ],
      notes: [
        "Order-linked inventory movements are cleared.",
        "Catalog, coupons, and customers are kept.",
      ],
    };
  }

  if (action === "clear_activity_logs") {
    return {
      action,
      title: meta.title,
      description: meta.description,
      confirmPhrase,
      tables: await countsForTables(CLEAR_ACTIVITY_TABLE_ORDER),
      storageBuckets: [],
      notes: ["No storage files are deleted by this action."],
    };
  }

  // clear_replace_photos
  const supabase = createSupabaseServiceClient();
  const { count } = await supabase
    .from("order_replace_requests")
    .select("*", { count: "exact", head: true })
    .not("photo_storage_path", "is", null);

  return {
    action,
    title: meta.title,
    description: meta.description,
    confirmPhrase,
    tables: [
      {
        table: "order_replace_requests",
        label: "Replace photos",
        count: count ?? 0,
      },
    ],
    storageBuckets: [
      { bucket: REPLACE_PHOTOS_BUCKET, label: "replacements" },
    ],
    notes: ["Request rows stay; only photo files and path columns are cleared."],
  };
}
