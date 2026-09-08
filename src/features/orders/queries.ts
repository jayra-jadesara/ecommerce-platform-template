import "server-only";

import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import type { ShippingAddressSnapshot } from "@/features/addresses/types";
import type {
  OrderActivityView,
  OrderDetail,
  OrderItemView,
  OrderListItem,
  OrderListQuery,
  OrderListResult,
  OrderPaymentView,
} from "@/features/orders/types";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/types/database";

function asAddress(value: unknown): ShippingAddressSnapshot {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    fullName: String(row.fullName ?? row.full_name ?? ""),
    phone: (row.phone as string | null) ?? null,
    addressLine1: String(row.addressLine1 ?? row.address_line_1 ?? ""),
    addressLine2: (row.addressLine2 as string | null) ??
      (row.address_line_2 as string | null) ??
      null,
    city: String(row.city ?? ""),
    state: (row.state as string | null) ?? null,
    postalCode: String(row.postalCode ?? row.postal_code ?? ""),
    country: String(row.country ?? ""),
  };
}

async function mapItems(
  orderId: string,
): Promise<OrderItemView[]> {
  const supabase = createSupabaseServiceClient();
  const { data: items } = await supabase
    .from("order_items")
    .select(
      "id, product_id, variant_id, product_name_snapshot, variant_name_snapshot, sku_snapshot, unit_price, quantity, line_total",
    )
    .eq("order_id", orderId);

  const views: OrderItemView[] = [];
  for (const item of items ?? []) {
    let imageUrl: string | null = null;
    if (item.product_id) {
      const { data: image } = await supabase
        .from("product_images")
        .select("storage_path, public_url")
        .eq("product_id", item.product_id)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (image) {
        imageUrl =
          image.public_url ||
          resolvePublicStorageUrl("products", image.storage_path) ||
          null;
      }
    }
    views.push({
      id: item.id,
      productId: item.product_id,
      variantId: item.variant_id,
      productName: item.product_name_snapshot,
      variantName: item.variant_name_snapshot,
      sku: item.sku_snapshot,
      unitPrice: Number(item.unit_price),
      quantity: item.quantity,
      lineTotal: Number(item.line_total),
      imageUrl,
    });
  }
  return views;
}

async function mapPayment(orderId: string): Promise<OrderPaymentView | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("payments")
    .select(
      "id, status, amount, currency, provider, provider_payment_id, provider_order_id, payment_method, paid_at, failure_reason",
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    amount: Number(data.amount),
    currency: data.currency,
    provider: data.provider,
    providerPaymentId: data.provider_payment_id,
    providerOrderId: data.provider_order_id,
    paymentMethod: data.payment_method,
    paidAt: data.paid_at,
    failureReason: data.failure_reason,
  };
}

async function mapActivities(orderId: string): Promise<OrderActivityView[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("order_activities")
    .select("id, event_type, message, created_at, metadata")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    message: row.message,
    createdAt: row.created_at,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }));
}

export async function getOrderDetail(input: {
  orderId: string;
  userId?: string | null;
  storeId?: string | null;
  asAdmin?: boolean;
}): Promise<OrderDetail | null> {
  const supabase = createSupabaseServiceClient();
  let query = supabase.from("orders").select("*").eq("id", input.orderId);

  if (!input.asAdmin && input.userId) {
    query = query.eq("user_id", input.userId);
  }
  if (input.storeId) {
    query = query.eq("store_id", input.storeId);
  }

  const { data: order } = await query.maybeSingle();
  if (!order) return null;

  const [items, payment, activities] = await Promise.all([
    mapItems(order.id),
    mapPayment(order.id),
    mapActivities(order.id),
  ]);

  const customerNameParts: string[] = [];
  if (order.user_id) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("first_name, last_name")
      .eq("id", order.user_id)
      .maybeSingle();
    if (profile?.first_name) customerNameParts.push(profile.first_name);
    if (profile?.last_name) customerNameParts.push(profile.last_name);
  }
  const customerName = customerNameParts.join(" ").trim() || null;

  return {
    id: order.id,
    storeId: order.store_id,
    orderNumber: order.order_number,
    userId: order.user_id,
    status: order.status,
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discount_amount),
    couponCode: order.coupon_code,
    shippingAmount: Number(order.shipping_amount),
    gatewayFee: Number(order.gateway_fee),
    taxAmount: Number(order.tax_amount),
    grandTotal: Number(order.grand_total),
    currency: order.currency,
    shippingAddress: asAddress(order.shipping_address),
    billingAddress: asAddress(order.billing_address),
    shippingProvider: order.shipping_provider,
    trackingNumber: order.tracking_number,
    shippedAt: order.shipped_at,
    deliveredAt: order.delivered_at,
    cancelledAt: order.cancelled_at,
    inventoryFinalizedAt: order.inventory_finalized_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items,
    payment,
    activities,
    customerEmail: null,
    customerName,
  };
}

export async function listCustomerOrders(input: {
  userId: string;
  page?: number;
  pageSize?: number;
}): Promise<OrderListResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createSupabaseServiceClient();
  const { data, count, error } = await supabase
    .from("orders")
    .select("id, order_number, status, grand_total, currency, created_at", {
      count: "exact",
    })
    .eq("user_id", input.userId)
    .neq("status", "PENDING")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return { items: [], total: 0, page, pageSize };
  }

  const items: OrderListItem[] = [];
  for (const row of data ?? []) {
    const [{ count: itemCount }, payment] = await Promise.all([
      supabase
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .eq("order_id", row.id),
      mapPayment(row.id),
    ]);
    items.push({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      grandTotal: Number(row.grand_total),
      currency: row.currency,
      createdAt: row.created_at,
      itemCount: itemCount ?? 0,
      paymentStatus: payment?.status ?? null,
    });
  }

  return { items, total: count ?? 0, page, pageSize };
}

export async function listAdminOrders(
  query: OrderListQuery,
): Promise<OrderListResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createSupabaseServiceClient();
  let builder = supabase
    .from("orders")
    .select(
      "id, order_number, status, grand_total, currency, created_at, user_id, store_id",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (query.storeId) {
    builder = builder.eq("store_id", query.storeId);
  }
  if (query.status && query.status !== "ALL") {
    builder = builder.eq("status", query.status as OrderStatus);
  }
  if (query.search?.trim()) {
    const q = query.search.trim();
    builder = builder.ilike("order_number", `%${q}%`);
  }

  const { data, count, error } = await builder.range(from, to);
  if (error) {
    return { items: [], total: 0, page, pageSize };
  }

  const items: OrderListItem[] = [];
  for (const row of data ?? []) {
    const [payment, profile, itemCountRes] = await Promise.all([
      mapPayment(row.id),
      row.user_id
        ? supabase
            .from("user_profiles")
            .select("first_name, last_name")
            .eq("id", row.user_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .eq("order_id", row.id),
    ]);

    if (
      query.paymentStatus &&
      query.paymentStatus !== "ALL" &&
      payment?.status !== query.paymentStatus
    ) {
      continue;
    }

    const name = [
      profile.data?.first_name,
      profile.data?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    items.push({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      grandTotal: Number(row.grand_total),
      currency: row.currency,
      createdAt: row.created_at,
      itemCount: itemCountRes.count ?? 0,
      paymentStatus: payment?.status ?? null,
      customerName: name || null,
    });
  }

  return { items, total: count ?? items.length, page, pageSize };
}
