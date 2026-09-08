import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type PaymentAuditAction =
  | "PAYMENT_INTENT_CREATED"
  | "PAYMENT_VERIFIED"
  | "PAYMENT_FAILED"
  | "PAYMENT_REFUNDED"
  | "RAZORPAY_WEBHOOK_PROCESSED"
  | "RAZORPAY_WEBHOOK_REJECTED"
  | "PAYMENT_RETRY_STARTED";

/**
 * Payment pipeline audits use the service role so non-admin customers
 * can still generate safe audit rows during checkout.
 */
export async function writePaymentAudit(input: {
  storeId: string;
  userId?: string | null;
  action: PaymentAuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from("audit_logs").insert({
      store_id: input.storeId,
      user_id: input.userId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      metadata: (input.metadata ?? {}) as Json,
    });
  } catch {
    // Never fail checkout because audit write failed.
  }
}
