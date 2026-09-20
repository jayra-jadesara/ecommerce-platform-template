import "server-only";

import { writeOrderActivity } from "@/features/orders/activity";
import { updateOrderStatus } from "@/features/orders/admin-service";
import { getOrderDetail } from "@/features/orders/queries";
import type { OrderDetail, OrderMutationResult } from "@/features/orders/types";
import {
  bluedartCreateShipment,
  bluedartTrack,
} from "@/features/shipping/courier/bluedart";
import {
  delhiveryCreateShipment,
  delhiveryTrack,
} from "@/features/shipping/courier/delhivery";
import {
  courierProviderLabel,
  isApiCourierProvider,
  isCourierProvider,
  type CourierProvider,
  type CourierStoreCredentials,
  type CreateShipmentResult,
  type TrackingPayload,
  type TrackResult,
} from "@/features/shipping/courier/types";
import { isDeliveredStatus } from "@/features/shipping/courier/urls";
import type { ShippingAddressSnapshot } from "@/features/addresses/types";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

const KEEP_SECRET = "__KEEP__";

export function secretKeepSentinel(): string {
  return KEEP_SECRET;
}

export function isSecretKeep(value: string | null | undefined): boolean {
  return value === KEEP_SECRET || value === "";
}

export async function loadCourierCredentials(
  storeId: string,
): Promise<CourierStoreCredentials> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("shipping_settings")
    .select(
      "courier_sandbox, courier_default_provider, delhivery_api_token, delhivery_client_name, bluedart_login_id, bluedart_licence_key, bluedart_api_key, bluedart_api_secret, bluedart_origin_area",
    )
    .eq("store_id", storeId)
    .maybeSingle();

  const defaultProvider =
    data?.courier_default_provider === "delhivery" ||
    data?.courier_default_provider === "bluedart"
      ? data.courier_default_provider
      : null;

  return {
    sandbox: data?.courier_sandbox !== false,
    defaultProvider,
    delhiveryApiToken: data?.delhivery_api_token ?? null,
    delhiveryClientName: data?.delhivery_client_name ?? null,
    bluedartLoginId: data?.bluedart_login_id ?? null,
    bluedartLicenceKey: data?.bluedart_licence_key ?? null,
    bluedartApiKey: data?.bluedart_api_key ?? null,
    bluedartApiSecret: data?.bluedart_api_secret ?? null,
    bluedartOriginArea: data?.bluedart_origin_area ?? null,
  };
}

function addressLine(address: ShippingAddressSnapshot): string {
  return [address.addressLine1, address.addressLine2]
    .filter(Boolean)
    .join(", ");
}

export async function trackWithProvider(input: {
  provider: "delhivery" | "bluedart";
  awb: string;
  credentials: CourierStoreCredentials;
}): Promise<TrackResult> {
  if (input.provider === "delhivery") {
    return delhiveryTrack({
      token: input.credentials.delhiveryApiToken ?? "",
      sandbox: input.credentials.sandbox,
      awb: input.awb,
    });
  }
  return bluedartTrack({
    sandbox: input.credentials.sandbox,
    loginId: input.credentials.bluedartLoginId ?? "",
    licenceKey: input.credentials.bluedartLicenceKey ?? "",
    apiKey: input.credentials.bluedartApiKey ?? "",
    apiSecret: input.credentials.bluedartApiSecret ?? "",
    awb: input.awb,
  });
}

export async function createWithProvider(input: {
  provider: "delhivery" | "bluedart";
  credentials: CourierStoreCredentials;
  order: OrderDetail;
}): Promise<CreateShipmentResult> {
  const paymentMode =
    input.order.payment?.provider === "cod" ? "COD" : "Prepaid";
  const shipment = {
    orderNumber: input.order.orderNumber,
    orderId: input.order.id,
    paymentMode: paymentMode as "COD" | "Prepaid",
    collectAmount: input.order.grandTotal,
    currency: input.order.currency,
    consignee: {
      name: input.order.shippingAddress.fullName,
      phone: input.order.shippingAddress.phone ?? "",
      address: addressLine(input.order.shippingAddress),
      city: input.order.shippingAddress.city,
      state: input.order.shippingAddress.state,
      postalCode: input.order.shippingAddress.postalCode,
      country: input.order.shippingAddress.country || "India",
    },
  };

  if (input.provider === "delhivery") {
    return delhiveryCreateShipment({
      token: input.credentials.delhiveryApiToken ?? "",
      sandbox: input.credentials.sandbox,
      clientName: input.credentials.delhiveryClientName ?? "",
      shipment,
    });
  }

  return bluedartCreateShipment({
    sandbox: input.credentials.sandbox,
    loginId: input.credentials.bluedartLoginId ?? "",
    licenceKey: input.credentials.bluedartLicenceKey ?? "",
    apiKey: input.credentials.bluedartApiKey ?? "",
    apiSecret: input.credentials.bluedartApiSecret ?? "",
    originArea: input.credentials.bluedartOriginArea ?? "",
    shipment,
  });
}

export async function persistTrackingSnapshot(input: {
  orderId: string;
  storeId: string;
  actorUserId?: string | null;
  provider: CourierProvider;
  awb: string;
  track: Extract<TrackResult, { ok: true }>;
  shippingProviderLabel?: string;
}): Promise<OrderMutationResult> {
  const supabase = createSupabaseServiceClient();
  const syncedAt = new Date().toISOString();
  const payload: TrackingPayload = {
    status: input.track.status,
    awb: input.awb,
    provider: input.provider,
    events: input.track.events,
    syncedAt,
    rawSummary: input.track.rawSummary ?? null,
  };

  const { error } = await supabase
    .from("orders")
    .update({
      courier_provider: input.provider,
      tracking_number: input.awb,
      shipping_provider:
        input.shippingProviderLabel ?? courierProviderLabel(input.provider),
      tracking_status: input.track.status,
      tracking_synced_at: syncedAt,
      tracking_payload: payload as unknown as Json,
    })
    .eq("id", input.orderId)
    .eq("store_id", input.storeId);

  if (error) {
    return { ok: false, error: error.message || "Unable to save tracking." };
  }

  await writeOrderActivity({
    orderId: input.orderId,
    storeId: input.storeId,
    actorUserId: input.actorUserId,
    eventType: "TRACKING_UPDATED",
    message: `Tracking synced (${input.track.status})`,
    metadata: {
      provider: input.provider,
      awb: input.awb,
      status: input.track.status,
    },
  });

  const detail = await getOrderDetail({
    orderId: input.orderId,
    storeId: input.storeId,
    asAdmin: true,
  });
  if (!detail) return { ok: false, error: "Unable to reload order." };
  return { ok: true, order: detail, message: "Tracking synced." };
}

export async function refreshOrderTracking(input: {
  orderId: string;
  storeId: string;
  actorUserId?: string | null;
  minIntervalMs?: number;
  force?: boolean;
}): Promise<OrderMutationResult> {
  const supabase = createSupabaseServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, store_id, status, tracking_number, courier_provider, shipping_provider, tracking_synced_at",
    )
    .eq("id", input.orderId)
    .eq("store_id", input.storeId)
    .maybeSingle();

  if (!order) return { ok: false, error: "Order not found." };

  const awb = (order.tracking_number ?? "").trim();
  if (!awb) return { ok: false, error: "Add a tracking number first." };

  let provider: CourierProvider = "manual";
  if (isCourierProvider(order.courier_provider)) {
    provider = order.courier_provider;
  } else {
    const label = (order.shipping_provider ?? "").toLowerCase();
    if (label.includes("delhivery")) provider = "delhivery";
    else if (label.includes("blue")) provider = "bluedart";
  }

  if (!isApiCourierProvider(provider)) {
    return {
      ok: false,
      error: "Select Delhivery or Blue Dart to sync via API.",
    };
  }

  const minInterval = input.minIntervalMs ?? 15 * 60 * 1000;
  if (
    !input.force &&
    order.tracking_synced_at &&
    Date.now() - new Date(order.tracking_synced_at).getTime() < minInterval
  ) {
    const detail = await getOrderDetail({
      orderId: order.id,
      storeId: input.storeId,
      asAdmin: true,
    });
    if (!detail) return { ok: false, error: "Unable to reload order." };
    return { ok: true, order: detail, message: "Tracking is up to date." };
  }

  const credentials = await loadCourierCredentials(input.storeId);
  const track = await trackWithProvider({ provider, awb, credentials });
  if (!track.ok) return { ok: false, error: track.error };

  const saved = await persistTrackingSnapshot({
    orderId: order.id,
    storeId: input.storeId,
    actorUserId: input.actorUserId,
    provider,
    awb,
    track,
  });

  if (
    saved.ok &&
    isDeliveredStatus(track.status) &&
    order.status === "SHIPPED"
  ) {
    const delivered = await updateOrderStatus({
      orderId: order.id,
      storeId: input.storeId,
      actorUserId: input.actorUserId,
      nextStatus: "DELIVERED",
    });
    if (delivered.ok) {
      return {
        ok: true,
        order: delivered.order,
        message: "Carrier reports delivered — order marked Delivered.",
      };
    }
  }

  return saved;
}

export async function createCourierShipmentForOrder(input: {
  orderId: string;
  storeId: string;
  actorUserId: string;
  provider: "delhivery" | "bluedart";
}): Promise<OrderMutationResult> {
  const detail = await getOrderDetail({
    orderId: input.orderId,
    storeId: input.storeId,
    asAdmin: true,
  });
  if (!detail) return { ok: false, error: "Order not found." };

  const credentials = await loadCourierCredentials(input.storeId);
  const created = await createWithProvider({
    provider: input.provider,
    credentials,
    order: detail,
  });
  if (!created.ok) return { ok: false, error: created.error };

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("orders")
    .update({
      courier_provider: input.provider,
      courier_shipment_id: created.shipmentId ?? created.awb,
      tracking_number: created.awb,
      shipping_provider: courierProviderLabel(input.provider),
      tracking_status: "PENDING",
      tracking_synced_at: new Date().toISOString(),
    })
    .eq("id", input.orderId)
    .eq("store_id", input.storeId);

  if (error) {
    return { ok: false, error: error.message || "Unable to save AWB." };
  }

  await writeOrderActivity({
    orderId: input.orderId,
    storeId: input.storeId,
    actorUserId: input.actorUserId,
    eventType: "COURIER_SHIPMENT_CREATED",
    message: `Shipment created via ${courierProviderLabel(input.provider)}`,
    metadata: {
      provider: input.provider,
      awb: created.awb,
      shipmentId: created.shipmentId ?? null,
    },
  });

  const reloaded = await getOrderDetail({
    orderId: input.orderId,
    storeId: input.storeId,
    asAdmin: true,
  });
  if (!reloaded) return { ok: false, error: "Unable to reload order." };
  return {
    ok: true,
    order: reloaded,
    message: `AWB ${created.awb} created.`,
  };
}

export type CourierSyncResult = {
  scanned: number;
  updated: number;
  delivered: number;
  failed: number;
};

export async function syncCourierShippedOrders(input?: {
  storeId?: string | null;
  limit?: number;
}): Promise<CourierSyncResult> {
  const supabase = createSupabaseServiceClient();
  const limit = Math.min(100, Math.max(1, input?.limit ?? 40));
  const result: CourierSyncResult = {
    scanned: 0,
    updated: 0,
    delivered: 0,
    failed: 0,
  };

  let settingsQuery = supabase
    .from("shipping_settings")
    .select("store_id")
    .eq("fulfillment_mode", "courier_api");

  if (input?.storeId) {
    settingsQuery = settingsQuery.eq("store_id", input.storeId);
  }

  const { data: stores } = await settingsQuery;
  for (const store of stores ?? []) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, store_id")
      .eq("store_id", store.store_id)
      .eq("status", "SHIPPED")
      .in("courier_provider", ["delhivery", "bluedart"])
      .not("tracking_number", "is", null)
      .order("updated_at", { ascending: true })
      .limit(limit);

    for (const order of orders ?? []) {
      result.scanned += 1;
      const synced = await refreshOrderTracking({
        orderId: order.id,
        storeId: order.store_id,
        force: true,
        minIntervalMs: 0,
      });
      if (!synced.ok) {
        result.failed += 1;
        continue;
      }
      result.updated += 1;
      if (synced.order.status === "DELIVERED") result.delivered += 1;
    }
  }

  return result;
}
