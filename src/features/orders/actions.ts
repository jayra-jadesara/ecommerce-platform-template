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

  const result = await updateOrderStatus({
    orderId: parsed.data.orderId,
    storeId,
    actorUserId: admin.user.id,
    nextStatus: parsed.data.nextStatus as OrderStatus,
    shippingProvider: parsed.data.shippingProvider,
    trackingNumber: parsed.data.trackingNumber,
  });

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

  const result = await updateOrderTracking({
    orderId: parsed.data.orderId,
    storeId,
    actorUserId: admin.user.id,
    shippingProvider: parsed.data.shippingProvider,
    trackingNumber: parsed.data.trackingNumber,
  });

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

  const result = await markOrderRefundedLocally({
    orderId: parsed.data.orderId,
    storeId,
    actorUserId: admin.user.id,
    note: parsed.data.note,
  });

  if (result.ok) revalidateOrderPaths(parsed.data.orderId);
  return result;
}
