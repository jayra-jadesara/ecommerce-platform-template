import "server-only";

import { writeOrderActivity } from "@/features/orders/activity";
import { writePaymentAudit } from "@/features/payments/audit";
import { canTransitionPaymentStatus } from "@/features/payments/state-machine";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { PaymentStatus } from "@/types/database";

/**
 * When a COD order is marked Delivered, cash was collected — mark payment Paid (CAPTURED).
 * Courier never needs admin access; store staff (or auto-deliver) drives this.
 */
export async function captureCodPaymentOnDelivered(input: {
  orderId: string;
  storeId: string;
  actorUserId?: string | null;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, provider")
    .eq("order_id", input.orderId)
    .eq("provider", "cod")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment) return;
  if (payment.status === "CAPTURED") return;

  const from = payment.status as PaymentStatus;
  if (!canTransitionPaymentStatus(from, "CAPTURED")) return;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("payments")
    .update({
      status: "CAPTURED",
      paid_at: now,
      payment_method: "cod",
    })
    .eq("id", payment.id)
    .in("status", ["CREATED", "PENDING", "AUTHORIZED"]);

  if (error) return;

  await writePaymentAudit({
    storeId: input.storeId,
    userId: input.actorUserId,
    action: "COD_PAYMENT_CAPTURED",
    entityType: "payment",
    entityId: payment.id,
    metadata: { orderId: input.orderId, from, to: "CAPTURED" },
  });

  await writeOrderActivity({
    orderId: input.orderId,
    storeId: input.storeId,
    actorUserId: input.actorUserId,
    eventType: "COD_PAYMENT_CAPTURED",
    message: "Cash on Delivery marked paid (order delivered)",
    metadata: { paymentId: payment.id },
  });
}
