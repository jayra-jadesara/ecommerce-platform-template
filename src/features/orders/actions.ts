"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminPath } from "@/config/admin-route";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { hasPermission, requirePermission } from "@/features/auth/session";
import {
  markOrderRefundedLocally,
  updateOrderStatus,
  updateOrderTracking,
} from "@/features/orders/admin-service";
import type { OrderMutationResult } from "@/features/orders/types";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";
import type { OrderStatus } from "@/types/database";

const statusSchema = z.object({
  orderId: z.string().uuid(),
  nextStatus: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ]),
  shippingProvider: z.string().max(120).optional().nullable(),
  trackingNumber: z.string().max(120).optional().nullable(),
});

const trackingSchema = z.object({
  orderId: z.string().uuid(),
  shippingProvider: z.string().max(120),
  trackingNumber: z.string().max(120),
});

const refundSchema = z.object({
  orderId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

function revalidateOrderPaths(orderId: string) {
  revalidatePath(getAdminPath("/orders"));
  revalidatePath(getAdminPath(`/orders/${orderId}`));
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
}

export async function adminUpdateOrderStatusAction(
  raw: unknown,
): Promise<OrderMutationResult> {
  const admin = await requirePermission("orders.update");
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "No active store." };

  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid." };
  }

  const result = await runLoggedMutation(
    {
      type: "ORDER",
      source: "SERVER",
      operation: "UPDATE_ORDER_STATUS",
      feature: "ORDERS",
      entityType: "order",
      entityId: parsed.data.orderId,
      storeId,
      route: "/orders",
    },
    () =>
      updateOrderStatus({
        orderId: parsed.data.orderId,
        storeId,
        actorUserId: admin.user.id,
        nextStatus: parsed.data.nextStatus as OrderStatus,
        shippingProvider: parsed.data.shippingProvider,
        trackingNumber: parsed.data.trackingNumber,
      }),
  );

  if (result.ok) revalidateOrderPaths(parsed.data.orderId);
  return result;
}

export async function adminUpdateOrderTrackingAction(
  raw: unknown,
): Promise<OrderMutationResult> {
  const admin = await requirePermission("orders.update");
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "No active store." };

  const parsed = trackingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid tracking details." };
  }

  const result = await runLoggedMutation(
    {
      type: "ORDER",
      source: "SERVER",
      operation: "UPDATE_ORDER_TRACKING",
      feature: "ORDERS",
      entityType: "order",
      entityId: parsed.data.orderId,
      storeId,
      route: "/orders",
    },
    () =>
      updateOrderTracking({
        orderId: parsed.data.orderId,
        storeId,
        actorUserId: admin.user.id,
        shippingProvider: parsed.data.shippingProvider,
        trackingNumber: parsed.data.trackingNumber,
      }),
  );

  if (result.ok) revalidateOrderPaths(parsed.data.orderId);
  return result;
}

export async function adminMarkOrderRefundedAction(
  raw: unknown,
): Promise<OrderMutationResult> {
  const admin = await requirePermission("orders.update");
  if (!hasPermission(admin, "payments.update")) {
    return {
      ok: false,
      error: "You need payment update permission to mark refunds.",
    };
  }
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "No active store." };

  const parsed = refundSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const result = await runLoggedMutation(
    {
      type: "ORDER",
      source: "SERVER",
      operation: "UPDATE_ORDER_STATUS",
      feature: "ORDERS",
      entityType: "order",
      entityId: parsed.data.orderId,
      storeId,
      route: "/orders",
    },
    () =>
      markOrderRefundedLocally({
        orderId: parsed.data.orderId,
        storeId,
        actorUserId: admin.user.id,
        note: parsed.data.note,
      }),
  );

  if (result.ok) revalidateOrderPaths(parsed.data.orderId);
  return result;
}

export async function requestOrderReplaceAction(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const { getCurrentUser } = await import("@/features/auth/session");
  const { createReplaceRequest } = await import(
    "@/features/orders/replace-service"
  );

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in to continue." };

  const orderId = String(formData.get("orderId") ?? "");
  const orderItemId = String(formData.get("orderItemId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const reasonCode = String(formData.get("reasonCode") ?? "");
  const customerNote = String(formData.get("customerNote") ?? "");
  const quantityRaw = Number(formData.get("quantity") ?? 1);
  const photoEntry = formData.get("photo");
  const photo =
    photoEntry instanceof File && photoEntry.size > 0 ? photoEntry : null;

  const parsed = z
    .object({
      orderId: z.string().uuid(),
      orderItemId: z.string().uuid(),
      reason: z.string().trim().min(3).max(500),
      reasonCode: z.string().trim().min(1).max(80),
      customerNote: z.string().trim().max(500).optional(),
      quantity: z.number().int().min(1).max(99),
    })
    .safeParse({
      orderId,
      orderItemId,
      reason,
      reasonCode,
      customerNote: customerNote || undefined,
      quantity: Number.isFinite(quantityRaw) ? quantityRaw : 1,
    });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid replacement request.",
    };
  }

  const result = await runLoggedMutation(
    {
      type: "ORDER",
      source: "SERVER",
      operation: "CREATE_REPLACE_REQUEST",
      feature: "ORDERS",
      entityType: "order_replace_requests",
      entityId: parsed.data.orderId,
      route: `/account/orders/${parsed.data.orderId}`,
    },
    () =>
      createReplaceRequest({
        userId: user.id,
        orderId: parsed.data.orderId,
        orderItemId: parsed.data.orderItemId,
        reason: parsed.data.reason,
        reasonCode: parsed.data.reasonCode,
        customerNote: parsed.data.customerNote ?? null,
        quantity: parsed.data.quantity,
        photo,
      }),
  );

  if (result.ok) revalidateOrderPaths(parsed.data.orderId);
  return result.ok
    ? { ok: true, message: result.message }
    : { ok: false, error: result.error };
}

const cancelOwnOrderSchema = z.object({
  orderId: z.string().uuid(),
});

/**
 * Customer self-serve cancel for Cash on Delivery orders while still
 * CONFIRMED or PROCESSING (pre-ship). Reuses admin cancel path + inventory restore.
 */
export async function cancelOwnOrderAction(
  raw: unknown,
): Promise<OrderMutationResult> {
  const { getCurrentUser } = await import("@/features/auth/session");
  const { canCustomerCancelCodOrder } = await import(
    "@/features/orders/customer-cancel"
  );
  const { createSupabaseServiceClient } = await import(
    "@/lib/supabase/admin"
  );

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in to continue." };

  const parsed = cancelOwnOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid order." };
  }

  const supabase = createSupabaseServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, store_id, user_id, status")
    .eq("id", parsed.data.orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) {
    return { ok: false, error: "Order not found." };
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("provider")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    !canCustomerCancelCodOrder({
      status: order.status,
      paymentProvider: payment?.provider ?? null,
    })
  ) {
    return {
      ok: false,
      error:
        "This Cash on Delivery order can no longer be cancelled. Contact the store if you need help.",
    };
  }

  const result = await runLoggedMutation(
    {
      type: "ORDER",
      source: "SERVER",
      operation: "CANCEL_OWN_ORDER",
      feature: "ORDERS",
      entityType: "order",
      entityId: order.id,
      storeId: order.store_id,
      route: `/account/orders/${order.id}`,
    },
    () =>
      updateOrderStatus({
        orderId: order.id,
        storeId: order.store_id,
        actorUserId: user.id,
        nextStatus: "CANCELLED",
      }),
  );

  if (result.ok) revalidateOrderPaths(order.id);
  return result;
}

export async function adminReviewReplaceRequestAction(raw: unknown): Promise<{
  ok: true;
  message: string;
} | { ok: false; error: string }> {
  const admin = await requirePermission("orders.update");
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "No active store." };

  const parsed = z
    .object({
      requestId: z.string().uuid(),
      orderId: z.string().uuid(),
      nextStatus: z.enum(["APPROVED", "REJECTED", "FULFILLED"]),
      adminNote: z.string().max(500).optional().nullable(),
    })
    .safeParse(raw);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid." };
  }

  const { reviewReplaceRequest } = await import(
    "@/features/orders/replace-service"
  );

  const result = await runLoggedMutation(
    {
      type: "ORDER",
      source: "SERVER",
      operation: "REVIEW_REPLACE_REQUEST",
      feature: "ORDERS",
      entityType: "order_replace_requests",
      entityId: parsed.data.requestId,
      storeId,
      route: "/orders",
    },
    () =>
      reviewReplaceRequest({
        storeId,
        actorUserId: admin.user.id,
        requestId: parsed.data.requestId,
        nextStatus: parsed.data.nextStatus,
        adminNote: parsed.data.adminNote,
      }),
  );

  if (result.ok) revalidateOrderPaths(parsed.data.orderId);
  return result.ok
    ? { ok: true, message: result.message }
    : { ok: false, error: result.error };
}
