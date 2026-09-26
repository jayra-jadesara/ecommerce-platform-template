import "server-only";

import type { Json } from "@/types/database";
import {
  CLEAR_ACTIVITY_TABLE_ORDER,
  CLEAR_ORDERS_TABLE_ORDER,
  FORMAT_RESET_STORAGE_BUCKETS,
  FORMAT_RESET_TABLE_ORDER,
  REPLACE_PHOTOS_BUCKET,
  assertWipeSafe,
  isConfirmPhraseValid,
  type PublicTable,
} from "@/features/platform-usage/cleanup/keep-wipe";
import {
  deleteAllTableRows,
  deleteOrderLinkedInventoryMovements,
  nullFeaturedProductRefs,
} from "@/features/platform-usage/cleanup/db";
import {
  isCleanupLocked,
  releaseCleanupLock,
  tryAcquireCleanupLock,
} from "@/features/platform-usage/cleanup/lock";
import {
  emptyStorageBucket,
  removeStoragePaths,
} from "@/features/platform-usage/cleanup/storage-delete";
import type {
  CleanupActionId,
  CleanupResult,
} from "@/features/platform-usage/cleanup/types";
import type { RetentionMonths } from "@/features/platform-usage/cleanup/retention";
import { isValidRetentionMonths } from "@/features/platform-usage/cleanup/retention";
import { executePurgeOlderThan } from "@/features/platform-usage/cleanup/purge-older";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

async function requireSuperAdminActor(): Promise<
  | { ok: true; userId: string; storeId: string | null }
  | { ok: false; error: string }
> {
  const { getCurrentAdmin } = await import("@/features/auth/session");
  const { hasAnyRole } = await import("@/features/auth/permissions");
  const { resolveActiveStoreId } = await import(
    "@/features/admin/settings/store-context"
  );

  const admin = await getCurrentAdmin();
  if (!admin || !hasAnyRole(admin.roles, ["SUPER_ADMIN"])) {
    return {
      ok: false,
      error: "Only a Super Admin can run storage cleanup.",
    };
  }

  let storeId: string | null = null;
  try {
    storeId = await resolveActiveStoreId();
  } catch {
    storeId = admin.admin.store_id ?? null;
  }

  return { ok: true, userId: admin.user.id, storeId };
}

async function writeCleanupAudit(input: {
  storeId: string | null;
  userId: string;
  action: CleanupActionId;
  metadata: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from("audit_logs").insert({
      store_id: input.storeId,
      user_id: input.userId,
      action: `CLEANUP_${input.action.toUpperCase()}`,
      entity_type: "platform_cleanup",
      entity_id: null,
      metadata: input.metadata as Json,
    });
  } catch (err) {
    console.error(
      "[cleanup] audit write failed",
      err instanceof Error ? err.message : err,
    );
  }
}

async function wipeTables(
  tables: readonly PublicTable[],
): Promise<Record<string, number>> {
  assertWipeSafe(tables);
  const supabase = createSupabaseServiceClient();
  const deleted: Record<string, number> = {};
  for (const table of tables) {
    deleted[table] = await deleteAllTableRows(supabase, table);
  }
  return deleted;
}

async function deleteUnusedCustomRoles(): Promise<number> {
  const supabase = createSupabaseServiceClient();
  const { data: customRoles, error } = await supabase
    .from("roles")
    .select("id")
    .eq("is_system", false);

  if (error || !customRoles?.length) return 0;

  let removed = 0;
  for (const role of customRoles) {
    const { count } = await supabase
      .from("admin_user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role_id", role.id);
    if ((count ?? 0) > 0) continue;

    await supabase.from("role_permissions").delete().eq("role_id", role.id);
    const { error: delErr } = await supabase
      .from("roles")
      .delete()
      .eq("id", role.id)
      .eq("is_system", false);
    if (!delErr) removed += 1;
  }
  return removed;
}

async function deleteShopperAccounts(): Promise<{
  deleted: number;
  warnings: string[];
}> {
  const supabase = createSupabaseServiceClient();
  const warnings: string[] = [];

  const { data: admins } = await supabase.from("admin_users").select("user_id");
  const adminIds = new Set((admins ?? []).map((a) => a.user_id));

  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("id");
  if (error) {
    warnings.push(`Could not list profiles: ${error.message}`);
    return { deleted: 0, warnings };
  }

  let deleted = 0;
  for (const profile of profiles ?? []) {
    if (adminIds.has(profile.id)) continue;
    await supabase.from("user_addresses").delete().eq("user_id", profile.id);
    const { error: authErr } = await supabase.auth.admin.deleteUser(profile.id);
    if (authErr) {
      warnings.push(`Shopper ${profile.id}: ${authErr.message}`);
      continue;
    }
    deleted += 1;
  }
  return { deleted, warnings };
}

async function runFormatReset(actor: {
  userId: string;
  storeId: string | null;
}): Promise<CleanupResult> {
  const supabase = createSupabaseServiceClient();
  const warnings: string[] = [];

  await writeCleanupAudit({
    storeId: actor.storeId,
    userId: actor.userId,
    action: "format_reset",
    metadata: { phase: "started" },
  });

  await nullFeaturedProductRefs(supabase);

  const deletedRows = await wipeTables(FORMAT_RESET_TABLE_ORDER);

  let deletedFiles = 0;
  for (const bucket of FORMAT_RESET_STORAGE_BUCKETS) {
    const result = await emptyStorageBucket(supabase, bucket);
    deletedFiles += result.removed;
    warnings.push(...result.errors);
  }

  const customRolesRemoved = await deleteUnusedCustomRoles();
  deletedRows.custom_roles = customRolesRemoved;

  const shoppers = await deleteShopperAccounts();
  warnings.push(...shoppers.warnings);

  await writeCleanupAudit({
    storeId: actor.storeId,
    userId: actor.userId,
    action: "format_reset",
    metadata: {
      phase: "completed",
      deletedRows,
      deletedFiles,
      deletedShoppers: shoppers.deleted,
    },
  });

  return {
    ok: true,
    action: "format_reset",
    deletedRows,
    deletedFiles,
    deletedShoppers: shoppers.deleted,
    warnings: warnings.length ? warnings : undefined,
    message: "Format reset completed. Store settings and team were kept.",
  };
}

async function runClearOrders(actor: {
  userId: string;
  storeId: string | null;
}): Promise<CleanupResult> {
  const supabase = createSupabaseServiceClient();
  const warnings: string[] = [];

  await writeCleanupAudit({
    storeId: actor.storeId,
    userId: actor.userId,
    action: "clear_orders_payments",
    metadata: { phase: "started" },
  });

  const deletedRows = await wipeTables(CLEAR_ORDERS_TABLE_ORDER);
  deletedRows.inventory_movements_order_linked =
    await deleteOrderLinkedInventoryMovements(supabase);

  const storage = await emptyStorageBucket(supabase, REPLACE_PHOTOS_BUCKET);
  warnings.push(...storage.errors);

  await writeCleanupAudit({
    storeId: actor.storeId,
    userId: actor.userId,
    action: "clear_orders_payments",
    metadata: {
      phase: "completed",
      deletedRows,
      deletedFiles: storage.removed,
    },
  });

  return {
    ok: true,
    action: "clear_orders_payments",
    deletedRows,
    deletedFiles: storage.removed,
    warnings: warnings.length ? warnings : undefined,
    message: "Orders, payments, and replace photos were cleared.",
  };
}

async function runClearActivity(actor: {
  userId: string;
  storeId: string | null;
}): Promise<CleanupResult> {
  await writeCleanupAudit({
    storeId: actor.storeId,
    userId: actor.userId,
    action: "clear_activity_logs",
    metadata: { phase: "started" },
  });

  const deletedRows = await wipeTables(CLEAR_ACTIVITY_TABLE_ORDER);

  // Audit after wipe so the completion row is the only remaining trail.
  await writeCleanupAudit({
    storeId: actor.storeId,
    userId: actor.userId,
    action: "clear_activity_logs",
    metadata: { phase: "completed", deletedRows },
  });

  return {
    ok: true,
    action: "clear_activity_logs",
    deletedRows,
    deletedFiles: 0,
    message: "Activity and log tables were cleared.",
  };
}

async function runClearReplacePhotos(actor: {
  userId: string;
  storeId: string | null;
}): Promise<CleanupResult> {
  const supabase = createSupabaseServiceClient();
  const warnings: string[] = [];

  const { data: rows } = await supabase
    .from("order_replace_requests")
    .select("id, photo_storage_path")
    .not("photo_storage_path", "is", null);

  const paths = (rows ?? [])
    .map((r) => r.photo_storage_path)
    .filter((p): p is string => Boolean(p));

  const storage = await removeStoragePaths(
    supabase,
    REPLACE_PHOTOS_BUCKET,
    paths,
  );
  warnings.push(...storage.errors);

  // Also empty any orphan files left in the bucket.
  const orphans = await emptyStorageBucket(supabase, REPLACE_PHOTOS_BUCKET);
  warnings.push(...orphans.errors);

  const { count } = await supabase
    .from("order_replace_requests")
    .update({ photo_storage_path: null }, { count: "exact" })
    .not("photo_storage_path", "is", null);

  await writeCleanupAudit({
    storeId: actor.storeId,
    userId: actor.userId,
    action: "clear_replace_photos",
    metadata: {
      phase: "completed",
      clearedPaths: count ?? 0,
      deletedFiles: storage.removed + orphans.removed,
    },
  });

  return {
    ok: true,
    action: "clear_replace_photos",
    deletedRows: { order_replace_requests_photos: count ?? 0 },
    deletedFiles: storage.removed + orphans.removed,
    warnings: warnings.length ? warnings : undefined,
    message: "Replace-request photos were removed from storage.",
  };
}

export async function executeCleanup(input: {
  action: CleanupActionId;
  confirmPhrase: string;
  retentionMonths?: number;
}): Promise<CleanupResult> {
  const actor = await requireSuperAdminActor();
  if (!actor.ok) return { ok: false, error: actor.error };

  if (!isConfirmPhraseValid(input.action, input.confirmPhrase)) {
    return {
      ok: false,
      error: `Type ${input.action === "format_reset" ? "RESET" : "CLEAR"} to confirm.`,
    };
  }

  if (isCleanupLocked() || !tryAcquireCleanupLock()) {
    return {
      ok: false,
      error: "Another cleanup is already running. Try again shortly.",
    };
  }

  try {
    switch (input.action) {
      case "format_reset":
        return await runFormatReset(actor);
      case "clear_orders_payments":
        return await runClearOrders(actor);
      case "clear_activity_logs":
        return await runClearActivity(actor);
      case "clear_replace_photos":
        return await runClearReplacePhotos(actor);
      case "purge_older_than": {
        if (!isValidRetentionMonths(input.retentionMonths)) {
          return {
            ok: false,
            error: "Choose how far back to delete (6 months to 6 years).",
          };
        }
        return await executePurgeOlderThan({
          months: input.retentionMonths as RetentionMonths,
          userId: actor.userId,
          storeId: actor.storeId,
        });
      }
      default:
        return { ok: false, error: "Unknown cleanup action." };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cleanup failed.";
    console.error("[cleanup] execute failed", message);
    return { ok: false, error: message };
  } finally {
    releaseCleanupLock();
  }
}
