"use server";

import { revalidatePath } from "next/cache";
import { getAdminPath } from "@/config/admin-route";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { requirePermission } from "@/features/auth/session";
import { writeErrorAudit } from "@/features/error-monitoring/audit";
import { LIMITS, type ErrorStatus } from "@/features/error-monitoring/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const statusSchema = z.enum([
  "OPEN",
  "INVESTIGATING",
  "RESOLVED",
  "IGNORED",
]);

export async function updateErrorLogStatusAction(input: {
  id: string;
  status: ErrorStatus;
  adminNote?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = await requirePermission("error_logs.update");
    const storeId = await resolveActiveStoreId();
    if (!storeId) return { ok: false, error: "No active store." };

    const status = statusSchema.parse(input.status);
    const note =
      input.adminNote != null
        ? String(input.adminNote).slice(0, LIMITS.adminNote)
        : null;

    const supabase = await createSupabaseServerClient();
    const { data: existing, error: loadError } = await supabase
      .from("error_logs")
      .select("id, reference_id, status")
      .eq("id", input.id)
      .eq("store_id", storeId)
      .maybeSingle();

    if (loadError || !existing) {
      return { ok: false, error: "Error log not found." };
    }

    const patch: {
      status: ErrorStatus;
      admin_note: string | null;
      resolved_at?: string | null;
      resolved_by?: string | null;
    } = {
      status,
      admin_note: note,
    };
    if (status === "RESOLVED" || status === "IGNORED") {
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = admin.user.id;
    } else {
      patch.resolved_at = null;
      patch.resolved_by = null;
    }

    const { error } = await supabase
      .from("error_logs")
      .update(patch)
      .eq("id", input.id)
      .eq("store_id", storeId);

    if (error) {
      return { ok: false, error: "Unable to update status." };
    }

    const auditAction =
      status === "RESOLVED"
        ? "ERROR_LOG_RESOLVED"
        : status === "IGNORED"
          ? "ERROR_LOG_IGNORED"
          : status === "INVESTIGATING"
            ? "ERROR_LOG_INVESTIGATING"
            : "ERROR_LOG_CREATED";

    if (status !== "OPEN") {
      await writeErrorAudit({
        storeId,
        userId: admin.user.id,
        action: auditAction,
        entityId: existing.id,
        referenceId: existing.reference_id,
      });
    }

    revalidatePath(getAdminPath("/error-logs"));
    revalidatePath(getAdminPath(`/error-logs/${input.id}`));
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to update status." };
  }
}
