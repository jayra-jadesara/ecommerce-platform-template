import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type BlogAuditAction =
  | "BLOG_POST_CREATED"
  | "BLOG_POST_UPDATED"
  | "BLOG_POST_PUBLISHED"
  | "BLOG_POST_UNPUBLISHED"
  | "BLOG_POST_ARCHIVED"
  | "BLOG_POST_DELETED"
  | "BLOG_CATEGORY_CREATED"
  | "BLOG_CATEGORY_UPDATED"
  | "BLOG_CATEGORY_DELETED"
  | "BLOG_SETTINGS_UPDATED";

export type BlogAuditEntityType =
  | "blog_post"
  | "blog_category"
  | "blog_settings";

export async function writeBlogAudit(input: {
  storeId: string;
  userId: string | null;
  action: BlogAuditAction;
  entityType: BlogAuditEntityType;
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
