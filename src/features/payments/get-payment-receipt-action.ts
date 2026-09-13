"use server";

import type { OrderItemView } from "@/features/orders/types";
import type { ShippingAddressSnapshot } from "@/features/addresses/types";
import type { ReceiptTotals } from "@/features/payments/receipt-totals";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/features/auth/session";
import { getOrderDetail } from "@/features/orders/queries";
import { z } from "zod";

export type PaymentReceiptData = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  orderStatus: string;
  items: OrderItemView[];
  shippingAddress: ShippingAddressSnapshot;
  totals: ReceiptTotals;
};

const paymentIdSchema = z.string().uuid();

/** Load receipt payload for a captured/authorized payment owned by the current user. */
export async function getPaymentReceiptAction(
  paymentId: string,
): Promise<PaymentReceiptData | null> {
  const parsed = paymentIdSchema.safeParse(paymentId.trim());
  if (!parsed.success) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createSupabaseServiceClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, amount, currency, order_id, user_id")
    .eq("id", parsed.data)
    .maybeSingle();

  if (!payment || payment.user_id !== user.id) return null;

  const confirmed =
    payment.status === "CAPTURED" || payment.status === "AUTHORIZED";
  if (!confirmed) return null;

  const order = await getOrderDetail({
    orderId: payment.order_id,
    userId: user.id,
  });
  if (!order) return null;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: Number(payment.amount),
    currency: payment.currency,
    paymentStatus: payment.status,
    orderStatus: order.status,
    items: order.items,
    shippingAddress: order.shippingAddress,
    totals: {
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      couponCode: order.couponCode,
      shippingAmount: order.shippingAmount,
      gatewayFee: order.gatewayFee,
      taxAmount: order.taxAmount,
      grandTotal: order.grandTotal,
    },
  };
}
