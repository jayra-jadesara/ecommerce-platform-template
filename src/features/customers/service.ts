import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/features/catalog/money";
import type { ShippingAddressSnapshot } from "@/features/addresses/types";

export type StoreCustomerAddressSummary = {
  fullName: string | null;
  phone: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

export type StoreCustomerListItem = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  orderCount: number;
  totalSpent: number;
  currency: string;
  lastOrderAt: string | null;
  lastOrderNumber: string | null;
  /** Default saved address, else last paid order shipping snapshot. */
  address: StoreCustomerAddressSummary | null;
};

export type StoreCustomerListResult = {
  items: StoreCustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
};

const PAID_PAYMENT_STATUSES = ["CAPTURED", "AUTHORIZED"] as const;

function asAddressSnapshot(value: unknown): ShippingAddressSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const line1 = String(row.addressLine1 ?? row.address_line_1 ?? "").trim();
  const city = String(row.city ?? "").trim();
  if (!line1 && !city) return null;
  return {
    fullName: String(row.fullName ?? row.full_name ?? "").trim(),
    phone: (row.phone as string | null) ?? null,
    addressLine1: line1,
    addressLine2:
      ((row.addressLine2 as string | null) ??
        (row.address_line_2 as string | null) ??
        null) ||
      null,
    city,
    state: ((row.state as string | null) ?? null) || null,
    postalCode: String(row.postalCode ?? row.postal_code ?? "").trim(),
    country: String(row.country ?? "").trim(),
  };
}

function toAddressSummary(
  snapshot: ShippingAddressSnapshot | null | undefined,
): StoreCustomerAddressSummary | null {
  if (!snapshot) return null;
  if (!snapshot.addressLine1 && !snapshot.city) return null;
  return {
    fullName: snapshot.fullName || null,
    phone: snapshot.phone,
    line1: snapshot.addressLine1 || null,
    line2: snapshot.addressLine2,
    city: snapshot.city || null,
    state: snapshot.state,
    postalCode: snapshot.postalCode || null,
    country: snapshot.country || null,
  };
}

/**
 * Customers for a store = people with at least one paid order.
 * Failed checkout attempts create order rows but are excluded.
 */
export async function listStoreCustomers(input: {
  storeId: string | null | undefined;
  page?: number;
  pageSize?: number;
  search?: string;
  /** ALL = any paid customer; REPEAT = 2+ orders; SINGLE = exactly 1 */
  activity?: "ALL" | "REPEAT" | "SINGLE";
}): Promise<StoreCustomerListResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 10));
  const storeId = input.storeId?.trim() || null;
  const activity = input.activity ?? "ALL";

  if (!storeId) {
    return { items: [], total: 0, page, pageSize };
  }

  const supabase = createSupabaseServiceClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, user_id, grand_total, currency, created_at, order_number, shipping_address",
    )
    .eq("store_id", storeId)
    .not("user_id", "is", null)
    .order("created_at", { ascending: false });

  if (error || !orders?.length) {
    return { items: [], total: 0, page, pageSize };
  }

  const orderIds = orders.map((order) => order.id);
  const { data: payments } = await supabase
    .from("payments")
    .select("order_id, status")
    .in("order_id", orderIds)
    .in("status", [...PAID_PAYMENT_STATUSES]);

  const paidOrderIds = new Set(
    (payments ?? []).map((payment) => payment.order_id).filter(Boolean),
  );
  const paidOrders = orders.filter((order) => paidOrderIds.has(order.id));

  if (!paidOrders.length) {
    return { items: [], total: 0, page, pageSize };
  }

  type Acc = {
    orderCount: number;
    totalSpent: number;
    currency: string;
    lastOrderAt: string;
    lastOrderNumber: string;
    lastShipping: ShippingAddressSnapshot | null;
  };

  const byUser = new Map<string, Acc>();
  for (const order of paidOrders) {
    const userId = order.user_id;
    if (!userId) continue;
    const existing = byUser.get(userId);
    if (!existing) {
      byUser.set(userId, {
        orderCount: 1,
        totalSpent: Number(order.grand_total) || 0,
        currency: order.currency || "INR",
        lastOrderAt: order.created_at,
        lastOrderNumber: order.order_number,
        lastShipping: asAddressSnapshot(order.shipping_address),
      });
    } else {
      existing.orderCount += 1;
      existing.totalSpent += Number(order.grand_total) || 0;
    }
  }

  const userIds = [...byUser.keys()];
  if (!userIds.length) {
    return { items: [], total: 0, page, pageSize };
  }

  const [{ data: profiles }, { data: addresses }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, first_name, last_name, phone")
      .in("id", userIds),
    supabase
      .from("user_addresses")
      .select(
        "user_id, full_name, phone, address_line_1, address_line_2, city, state, postal_code, country, is_default, updated_at",
      )
      .in("user_id", userIds)
      .order("updated_at", { ascending: false }),
  ]);

  const profileMap = new Map((profiles ?? []).map((row) => [row.id, row]));

  // Prefer is_default address; otherwise most recently updated (query order).
  type AddressRow = NonNullable<typeof addresses>[number];
  const defaults = new Map<string, AddressRow>();
  const firstSeen = new Map<string, AddressRow>();
  for (const row of addresses ?? []) {
    if (!row.user_id) continue;
    if (!firstSeen.has(row.user_id)) firstSeen.set(row.user_id, row);
    if (row.is_default) defaults.set(row.user_id, row);
  }

  const addressByUser = new Map<string, StoreCustomerAddressSummary>();
  for (const userId of userIds) {
    const row = defaults.get(userId) ?? firstSeen.get(userId);
    if (!row) continue;
    addressByUser.set(userId, {
      fullName: row.full_name || null,
      phone: row.phone,
      line1: row.address_line_1 || null,
      line2: row.address_line_2,
      city: row.city || null,
      state: row.state,
      postalCode: row.postal_code || null,
      country: row.country || null,
    });
  }

  const emailMap = new Map<string, string | null>();
  await Promise.all(
    userIds.map(async (id) => {
      try {
        const { data } = await supabase.auth.admin.getUserById(id);
        emailMap.set(id, data.user?.email ?? null);
      } catch {
        emailMap.set(id, null);
      }
    }),
  );

  const search = input.search?.trim().toLowerCase() ?? "";
  let items: StoreCustomerListItem[] = userIds.map((id) => {
    const acc = byUser.get(id)!;
    const profile = profileMap.get(id);
    const name = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    const address =
      addressByUser.get(id) ?? toAddressSummary(acc.lastShipping);
    return {
      id,
      name: name || null,
      email: emailMap.get(id) ?? null,
      phone: profile?.phone ?? null,
      orderCount: acc.orderCount,
      totalSpent: acc.totalSpent,
      currency: acc.currency,
      lastOrderAt: acc.lastOrderAt,
      lastOrderNumber: acc.lastOrderNumber,
      address,
    };
  });

  if (search) {
    items = items.filter((item) => {
      const addr = item.address;
      const hay = [
        item.name,
        item.email,
        item.phone,
        item.lastOrderNumber,
        addr?.fullName,
        addr?.phone,
        addr?.line1,
        addr?.line2,
        addr?.city,
        addr?.state,
        addr?.postalCode,
        addr?.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(search);
    });
  }

  if (activity === "REPEAT") {
    items = items.filter((item) => item.orderCount >= 2);
  } else if (activity === "SINGLE") {
    items = items.filter((item) => item.orderCount === 1);
  }

  items.sort((a, b) => {
    const aTime = a.lastOrderAt ? Date.parse(a.lastOrderAt) : 0;
    const bTime = b.lastOrderAt ? Date.parse(b.lastOrderAt) : 0;
    return bTime - aTime;
  });

  const total = items.length;
  const from = (page - 1) * pageSize;
  const pageItems = items.slice(from, from + pageSize);

  return { items: pageItems, total, page, pageSize };
}

export async function countStoreCustomers(
  storeId: string | null | undefined,
): Promise<number> {
  const result = await listStoreCustomers({
    storeId,
    page: 1,
    pageSize: 1,
  });
  return result.total;
}

/** Keep for tests / display helpers without importing money into service consumers twice. */
export function formatCustomerSpend(amount: number, currency: string): string {
  return formatMoney(amount, currency);
}
