import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export async function writeOrderActivity(input: {
  orderId: string;
  storeId: string;
  actorUserId?: string | null;
  eventType: string;
  message?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from("order_activities").insert({
      order_id: input.orderId,
      store_id: input.storeId,
      actor_user_id: input.actorUserId ?? null,
      event_type: input.eventType,
      message: input.message ?? null,
      metadata: (input.metadata ?? {}) as Json,
    });
  } catch {
    // Never fail fulfillment on activity write.
  }
}

export async function writeOrderAudit(input: {
  storeId: string;
  userId?: string | null;
  action: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from("audit_logs").insert({
      store_id: input.storeId,
      user_id: input.userId ?? null,
      action: input.action,
      entity_type: "order",
      entity_id: input.entityId,
      metadata: (input.metadata ?? {}) as Json,
    });
  } catch {
    // Best-effort.
  }
}
