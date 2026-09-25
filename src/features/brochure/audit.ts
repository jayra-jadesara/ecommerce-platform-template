import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type BrochureAuditAction =
  | "BROCHURE_CREATED"
  | "BROCHURE_UPDATED"
  | "BROCHURE_DELETED"
  | "BROCHURE_PDF_UPLOADED"
  | "BROCHURE_PAGE_DESCRIPTION_UPDATED"
  | "BROCHURE_PDF_MAX_MB_UPDATED";

export type BrochureAuditEntityType = "store_brochure";

export async function writeBrochureAudit(input: {
  storeId: string;
  userId: string | null;
  action: BrochureAuditAction;
  entityType: BrochureAuditEntityType;
  entityId: string;
  metadata?: Json;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.from("audit_logs").insert({
    store_id: input.storeId,
    user_id: input.userId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? {},
  });
}
