import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/features/catalog/money";

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
};

export type StoreCustomerListResult = {
  items: StoreCustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
};

const PAID_PAYMENT_STATUSES = ["CAPTURED", "AUTHORIZED"] as const;

/**
 * Customers for a store = people with at least one paid order.
 * Failed checkout attempts create order rows but are excluded.
 */
export async function listStoreCustomers(input: {
  storeId: string | null | undefined;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<StoreCustomerListResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const storeId = input.storeId?.trim() || null;

  if (!storeId) {
    return { items: [], total: 0, page, pageSize };
  }

  const supabase = createSupabaseServiceClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, user_id, grand_total, currency, created_at, order_number")
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

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, first_name, last_name, phone")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((row) => [row.id, row]));

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
    };
  });

  if (search) {
    items = items.filter((item) => {
      const hay = [item.name, item.email, item.phone, item.lastOrderNumber]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(search);
    });
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
