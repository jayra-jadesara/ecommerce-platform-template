"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCheckoutPaymentSession } from "@/features/payments/checkout-session";
import { verifyCheckoutPayment } from "@/features/payments/verify";
import type {
  PaymentActionResult,
  StartCheckoutPaymentResult,
} from "@/features/payments/types";
import { getCurrentUser } from "@/features/auth/session";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { markPaymentFailed } from "@/features/payments/fulfillment";

const startSchema = z.object({
  addressId: z.string().uuid("Select a valid address."),
});

const verifySchema = z.object({
  paymentId: z.string().uuid(),
  razorpayPaymentId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

const cancelSchema = z.object({
  paymentId: z.string().uuid(),
});

export async function startCheckoutPaymentAction(
  raw: unknown,
): Promise<StartCheckoutPaymentResult> {
  const parsed = startSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request.",
      code: "VALIDATION",
    };
  }
  return createCheckoutPaymentSession(parsed.data);
}

export async function verifyCheckoutPaymentAction(
  raw: unknown,
): Promise<PaymentActionResult> {
  const parsed = verifySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid payment confirmation.",
      code: "VALIDATION",
    };
  }

  const result = await verifyCheckoutPayment(parsed.data);
  if (result.ok) {
    revalidatePath("/checkout");
    revalidatePath("/cart");
    revalidatePath("/account/payments");
    revalidatePath("/account/orders");
  }
  return result;
}

export async function cancelCheckoutPaymentAction(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = cancelSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid payment." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const supabase = createSupabaseServiceClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, user_id, order_id, status, orders!inner(store_id)")
    .eq("id", parsed.data.paymentId)
    .maybeSingle();

  if (!payment || payment.user_id !== user.id) {
    return { ok: false, error: "Payment not found." };
  }

  if (payment.status === "CAPTURED" || payment.status === "AUTHORIZED") {
    return { ok: false, error: "Payment already completed." };
  }

  const order = payment.orders as unknown as { store_id: string };
  await markPaymentFailed({
    paymentId: payment.id,
    storeId: order.store_id,
    userId: user.id,
    reason: "Checkout dismissed by customer.",
  });

  await supabase
    .from("orders")
    .update({ status: "CANCELLED" })
    .eq("id", payment.order_id)
    .eq("status", "PENDING");

  return { ok: true };
}
