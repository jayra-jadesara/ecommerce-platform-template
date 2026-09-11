import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type ErrorAuditAction =
  | "ERROR_LOG_CREATED"
  | "ERROR_LOG_RESOLVED"
  | "ERROR_LOG_IGNORED"
  | "ERROR_LOG_INVESTIGATING";

export async function writeErrorAudit(input: {
  storeId?: string | null;
  userId?: string | null;
  action: ErrorAuditAction;
  entityId: string;
  referenceId: string;
}): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from("audit_logs").insert({
      store_id: input.storeId ?? null,
      user_id: input.userId ?? null,
      action: input.action,
      entity_type: "error_log",
      entity_id: input.entityId,
      metadata: {
        reference_id: input.referenceId,
      } as Json,
    });
  } catch {
    // Never fail because audit write failed.
  }
}
