import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type ContentAuditAction =
  | "PAGE_CREATED"
  | "PAGE_UPDATED"
  | "PAGE_PUBLISHED"
  | "PAGE_UNPUBLISHED"
  | "PAGE_ARCHIVED"
  | "HOMEPAGE_UPDATED"
  | "HOMEPAGE_PUBLISHED"
  | "SECTION_CREATED"
  | "SECTION_UPDATED"
  | "SECTION_REORDERED"
  | "SECTION_DELETED"
  | "BANNER_CREATED"
  | "BANNER_UPDATED"
  | "BANNER_DELETED";

export async function writeContentAudit(input: {
  storeId: string;
  userId: string | null;
  action: ContentAuditAction;
  entityType: "page" | "page_section" | "banner" | "homepage";
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
