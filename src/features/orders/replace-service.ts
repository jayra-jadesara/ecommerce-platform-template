import "server-only";

import { randomUUID } from "node:crypto";
import { writeOrderActivity, writeOrderAudit } from "@/features/orders/activity";
import type { OrderReplaceRequestView } from "@/features/orders/types";
import {
  returnPolicyAllowsReplace,
  type ReplaceRequestStatus,
} from "@/features/shipping/policies";
import {
  validateImageUpload,
} from "@/features/media/validation";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const MAX_REPLACE_PHOTO_BYTES = 1 * 1024 * 1024;
const OPEN_STATUSES: ReplaceRequestStatus[] = ["REQUESTED", "APPROVED"];

export type ReplaceMutationResult =
  | { ok: true; message: string; requestId?: string }
  | { ok: false; error: string };

async function signedPhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.storage
    .from(STORAGE_BUCKETS.replacements)
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

function mapRequest(
  row: {
    id: string;
    order_id: string;
    order_item_id: string;
    status: string;
    reason: string;
    customer_note: string | null;
    admin_note: string | null;
    photo_storage_path: string | null;
    quantity: number;
    created_at: string;
    reviewed_at: string | null;
  },
  productName: string,
  photoUrl: string | null,
): OrderReplaceRequestView {
  return {
    id: row.id,
    orderId: row.order_id,
    orderItemId: row.order_item_id,
    productName,
    status: row.status as ReplaceRequestStatus,
    reason: row.reason,
    customerNote: row.customer_note,
    adminNote: row.admin_note,
    photoUrl,
    quantity: row.quantity,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export async function listReplaceRequestsForOrder(
  orderId: string,
): Promise<OrderReplaceRequestView[]> {
  const supabase = createSupabaseServiceClient();
  const { data: rows } = await supabase
    .from("order_replace_requests")
    .select(
      "id, order_id, order_item_id, status, reason, customer_note, admin_note, photo_storage_path, quantity, created_at, reviewed_at",
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (!rows?.length) return [];

  const itemIds = [...new Set(rows.map((row) => row.order_item_id))];
  const { data: items } = await supabase
    .from("order_items")
    .select("id, product_name_snapshot")
    .in("id", itemIds);
  const names = new Map(
    (items ?? []).map((item) => [item.id, item.product_name_snapshot]),
  );

  const views: OrderReplaceRequestView[] = [];
  for (const row of rows) {
    views.push(
      mapRequest(
        row,
        names.get(row.order_item_id) ?? "Item",
        await signedPhotoUrl(row.photo_storage_path),
      ),
    );
  }
  return views;
}

export async function getReplacePhotoRequired(
  storeId: string,
): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("shipping_settings")
    .select("replace_photo_required")
    .eq("store_id", storeId)
    .maybeSingle();
  return Boolean(data?.replace_photo_required);
}

export async function createReplaceRequest(input: {
  userId: string;
  orderId: string;
  orderItemId: string;
  reason: string;
  customerNote?: string | null;
  quantity?: number;
  photo?: File | null;
}): Promise<ReplaceMutationResult> {
  const supabase = createSupabaseServiceClient();
  const reason = input.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: "Please describe why you need a replacement." };
  }
  if (reason.length > 500) {
    return { ok: false, error: "Reason is too long (max 500 characters)." };
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, store_id, user_id, status")
    .eq("id", input.orderId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "DELIVERED" && order.status !== "SHIPPED") {
    return {
      ok: false,
      error: "Replacements can be requested after the order is shipped or delivered.",
    };
  }

  const { data: item } = await supabase
    .from("order_items")
    .select("id, order_id, quantity, return_policy, returns_allowed, product_name_snapshot")
    .eq("id", input.orderItemId)
    .eq("order_id", order.id)
    .maybeSingle();

  if (!item) return { ok: false, error: "Order item not found." };

  const policy =
    item.return_policy === "no_return_refund" ||
    item.return_policy === "no_replace" ||
    item.return_policy === "replace_only"
      ? item.return_policy
      : item.returns_allowed === true
        ? "no_replace"
        : "no_return_refund";

  if (!returnPolicyAllowsReplace(policy)) {
    return {
      ok: false,
      error: "This item is not eligible for replacement.",
    };
  }

  const qty = Math.min(
    Math.max(1, Math.floor(input.quantity ?? 1)),
    item.quantity,
  );

  const { data: open } = await supabase
    .from("order_replace_requests")
    .select("id")
    .eq("order_item_id", item.id)
    .in("status", OPEN_STATUSES)
    .maybeSingle();

  if (open) {
    return {
      ok: false,
      error: "A replacement request is already open for this item.",
    };
  }

  const photoRequired = await getReplacePhotoRequired(order.store_id);
  let photoPath: string | null = null;

  if (photoRequired && !input.photo) {
    return {
      ok: false,
      error: "A photo is required for replacement requests.",
    };
  }

  if (input.photo && input.photo.size > 0) {
    const bytes = new Uint8Array(await input.photo.arrayBuffer());
    const validated = validateImageUpload({
      declaredMime: input.photo.type,
      size: input.photo.size,
      fileName: input.photo.name,
      bytes,
      maxBytes: MAX_REPLACE_PHOTO_BYTES,
    });
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }
    const ext = validated.ext;
    photoPath = `${order.store_id}/${order.id}/${randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.replacements)
      .upload(photoPath, bytes, {
        contentType: validated.mime,
        upsert: false,
        cacheControl: "3600",
      });
    if (uploadError) {
      return unexpectedFailure({
        type: "STORAGE",
        source: "SERVER",
        operation: "REPLACE_PHOTO_UPLOAD",
        feature: "ORDERS",
        message: "Could not upload replacement photo",
        error: uploadError,
        storeId: order.store_id,
        orderId: order.id,
        route: `/account/orders/${order.id}`,
      });
    }
  }

  const { data: created, error } = await supabase
    .from("order_replace_requests")
    .insert({
      store_id: order.store_id,
      order_id: order.id,
      order_item_id: item.id,
      user_id: input.userId,
      status: "REQUESTED",
      reason,
      customer_note: input.customerNote?.trim() || null,
      photo_storage_path: photoPath,
      quantity: qty,
    })
    .select("id")
    .single();

  if (error || !created) {
    if (photoPath) {
      await supabase.storage.from(STORAGE_BUCKETS.replacements).remove([photoPath]);
    }
    if (error?.code === "23505") {
      return {
        ok: false,
        error: "A replacement request is already open for this item.",
      };
    }
    return unexpectedFailure({
      type: "ORDER",
      source: "DATABASE",
      operation: "CREATE_REPLACE_REQUEST",
      feature: "ORDERS",
      message: "Could not create replacement request",
      error: error ?? undefined,
      databaseCode: error?.code,
      storeId: order.store_id,
      orderId: order.id,
      route: `/account/orders/${order.id}`,
    });
  }

  await writeOrderActivity({
    orderId: order.id,
    storeId: order.store_id,
    actorUserId: input.userId,
    eventType: "REPLACE_REQUESTED",
    message: `Replacement requested for ${item.product_name_snapshot}`,
    metadata: {
      requestId: created.id,
      orderItemId: item.id,
      reason,
      hasPhoto: Boolean(photoPath),
    },
  });

  return {
    ok: true,
    message: "Replacement request sent. We’ll review it shortly.",
    requestId: created.id,
  };
}

export async function reviewReplaceRequest(input: {
  storeId: string;
  actorUserId: string;
  requestId: string;
  nextStatus: "APPROVED" | "REJECTED" | "FULFILLED";
  adminNote?: string | null;
}): Promise<ReplaceMutationResult> {
  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase
    .from("order_replace_requests")
    .select("id, order_id, store_id, status, order_item_id")
    .eq("id", input.requestId)
    .eq("store_id", input.storeId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Replacement request not found." };

  const allowed: Record<string, ReplaceRequestStatus[]> = {
    REQUESTED: ["APPROVED", "REJECTED"],
    APPROVED: ["FULFILLED", "REJECTED"],
  };
  if (!(allowed[row.status] ?? []).includes(input.nextStatus)) {
    return {
      ok: false,
      error: `Cannot move this request from ${row.status} to ${input.nextStatus}.`,
    };
  }

  const { error } = await supabase
    .from("order_replace_requests")
    .update({
      status: input.nextStatus,
      admin_note: input.adminNote?.trim() || null,
      reviewed_by: input.actorUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", row.status);

  if (error) {
    return unexpectedFailure({
      type: "ORDER",
      source: "DATABASE",
      operation: "REVIEW_REPLACE_REQUEST",
      feature: "ORDERS",
      message: "Could not update replacement request",
      error,
      databaseCode: error.code,
      storeId: input.storeId,
      orderId: row.order_id,
      route: "/orders",
    });
  }

  await writeOrderActivity({
    orderId: row.order_id,
    storeId: input.storeId,
    actorUserId: input.actorUserId,
    eventType: `REPLACE_${input.nextStatus}`,
    message: `Replacement request ${input.nextStatus.toLowerCase()}`,
    metadata: {
      requestId: row.id,
      from: row.status,
      to: input.nextStatus,
      adminNote: input.adminNote ?? null,
    } as Record<string, unknown>,
  });

  await writeOrderAudit({
    storeId: input.storeId,
    userId: input.actorUserId,
    action: `REPLACE_${input.nextStatus}`,
    entityId: row.order_id,
    metadata: { requestId: row.id, orderItemId: row.order_item_id } as Record<
      string,
      unknown
    >,
  });

  const labels = {
    APPROVED: "Replacement approved. Prepare a replacement shipment.",
    REJECTED: "Replacement request rejected.",
    FULFILLED: "Marked as replacement sent.",
  } as const;

  return { ok: true, message: labels[input.nextStatus] };
}
