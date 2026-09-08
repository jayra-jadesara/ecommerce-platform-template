import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type CouponAuditAction =
  | "COUPON_CREATED"
  | "COUPON_UPDATED"
  | "COUPON_DISABLED"
  | "COUPON_DELETED"
  | "COUPON_REDEEMED";

export async function writeCouponAudit(input: {
  storeId: string;
  userId: string | null;
  action: CouponAuditAction;
  entityId: string;
  metadata?: Json;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.from("audit_logs").insert({
    store_id: input.storeId,
    user_id: input.userId,
    action: input.action,
    entity_type: "coupon",
    entity_id: input.entityId,
    metadata: input.metadata ?? {},
  });
}
