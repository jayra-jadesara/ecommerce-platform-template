import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const CAPTURED = "CAPTURED" as const;

export type DashboardDayPoint = {
  day: string;
  label: string;
  /** All orders created that day */
  placed: number;
  /** Orders with CAPTURED payment */
  paid: number;
  /** Orders with DELIVERED status */
  delivered: number;
  /** Revenue from paid orders (major units) */
  revenue: number;
};

export type DashboardProductRank = {
  productId: string;
  name: string;
  value: number;
  /** Optional secondary metric (e.g. avg rating) */
  meta?: string;
};

export type DashboardReviewStats = {
  total: number;
  pending: number;
  approved: number;
  avgRating: number | null;
  byRating: Array<{ rating: number; count: number }>;
  /** Products that received reviews (with count + avg) */
  byProduct: DashboardProductRank[];
};

export type AdminDashboardAnalytics = {
  days: number;
  from: string;
  to: string;
  currency: string;
  ordersByDay: DashboardDayPoint[];
  totals: {
    placed: number;
    paid: number;
    delivered: number;
    revenue: number;
  };
  topSold: DashboardProductRank[];
  topWishlisted: DashboardProductRank[];
  topViewed: DashboardProductRank[];
  reviews: DashboardReviewStats;
  viewsAvailable: boolean;
};

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shortLabel(isoDay: string): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(y, m - 1, d));
}

function addDaysIso(isoDay: string, delta: number): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  const date = new Date(y, m - 1, d + delta);
  return dayKey(date);
}

function todayIso(): string {
  return dayKey(new Date());
}

function emptySeries(from: string, to: string): DashboardDayPoint[] {
  const out: DashboardDayPoint[] = [];
  let cursor = from;
  while (cursor <= to) {
    out.push({
      day: cursor,
      label: shortLabel(cursor),
      placed: 0,
      paid: 0,
      delivered: 0,
      revenue: 0,
    });
    cursor = addDaysIso(cursor, 1);
  }
  return out;
}

export type DashboardAnalyticsQuery = {
  days?: number;
  from?: string | null;
  to?: string | null;
};

function resolveRange(options?: DashboardAnalyticsQuery): {
  days: number;
  from: string;
  to: string;
} {
  const to =
    options?.to && /^\d{4}-\d{2}-\d{2}$/.test(options.to)
      ? options.to
      : todayIso();
  if (options?.from && /^\d{4}-\d{2}-\d{2}$/.test(options.from)) {
    const from = options.from <= to ? options.from : to;
    const approxDays =
      Math.round(
        (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000,
      ) + 1;
    return { days: Math.min(Math.max(approxDays, 1), 90), from, to };
  }
  const days = Math.min(Math.max(options?.days ?? 14, 7), 90);
  return { days, from: addDaysIso(to, -(days - 1)), to };
}

/**
 * Store performance charts for the admin Dashboard (not staff audit activity).
 */
export async function getAdminDashboardAnalytics(
  storeId: string | null,
  options?: DashboardAnalyticsQuery,
): Promise<AdminDashboardAnalytics> {
  const { days, from, to } = resolveRange(options);
  const empty: AdminDashboardAnalytics = {
    days,
    from,
    to,
    currency: "INR",
    ordersByDay: emptySeries(from, to),
    totals: { placed: 0, paid: 0, delivered: 0, revenue: 0 },
    topSold: [],
    topWishlisted: [],
    topViewed: [],
    reviews: {
      total: 0,
      pending: 0,
      approved: 0,
      avgRating: null,
      byRating: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: 0 })),
      byProduct: [],
    },
    viewsAvailable: true,
  };

  if (!storeId?.trim()) return empty;

  const supabase = createSupabaseServiceClient();
  const fromIso = `${from}T00:00:00.000Z`;
  const toIso = `${to}T23:59:59.999Z`;

  const [ordersRes, settingsRes, wishlistsRes, reviewsRes, viewedRes] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id, grand_total, currency, created_at, status")
        .eq("store_id", storeId)
        .gte("created_at", fromIso)
        .lte("created_at", toIso)
        .order("created_at", { ascending: true }),
      supabase
        .from("store_settings")
        .select("currency")
        .eq("store_id", storeId)
        .maybeSingle(),
      supabase.from("wishlists").select("id").eq("store_id", storeId),
      supabase
        .from("product_reviews")
        .select("id, rating, status, product_id, created_at")
        .eq("store_id", storeId)
        .gte("created_at", fromIso)
        .lte("created_at", toIso),
      supabase
        .from("products")
        .select("id, name, view_count")
        .eq("store_id", storeId)
        .gt("view_count", 0)
        .order("view_count", { ascending: false })
        .limit(8),
    ]);

  const orders = ordersRes.data ?? [];
  const currency =
    settingsRes.data?.currency ??
    orders.find((row) => row.currency)?.currency ??
    "INR";

  const orderIds = orders.map((row) => row.id);
  const paidIds = new Set<string>();
  if (orderIds.length) {
    const { data: payments } = await supabase
      .from("payments")
      .select("order_id")
      .in("order_id", orderIds)
      .eq("status", CAPTURED);
    for (const row of payments ?? []) {
      if (row.order_id) paidIds.add(row.order_id);
    }
  }

  const seriesMap = new Map(
    emptySeries(from, to).map((point) => [point.day, { ...point }]),
  );
  let totalsPlaced = 0;
  let totalsPaid = 0;
  let totalsDelivered = 0;
  let totalsRevenue = 0;

  for (const order of orders) {
    const created = new Date(order.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const key = dayKey(created);
    const point = seriesMap.get(key);
    if (!point) continue;

    point.placed += 1;
    totalsPlaced += 1;

    if (order.status === "DELIVERED") {
      point.delivered += 1;
      totalsDelivered += 1;
    }

    if (paidIds.has(order.id)) {
      point.paid += 1;
      totalsPaid += 1;
      const amount = Number(order.grand_total) || 0;
      point.revenue += amount;
      totalsRevenue += amount;
    }
  }
  const ordersByDay = [...seriesMap.values()];

  let topSold: DashboardProductRank[] = [];
  const paidOrderIds = orders
    .filter((row) => paidIds.has(row.id))
    .map((row) => row.id);
  if (paidOrderIds.length) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, product_name_snapshot, quantity")
      .in("order_id", paidOrderIds);

    const counts = new Map<
      string,
      { productId: string; name: string; value: number }
    >();
    for (const item of items ?? []) {
      const id = item.product_id ?? item.product_name_snapshot;
      const prev = counts.get(id);
      const qty = Number(item.quantity) || 0;
      if (prev) prev.value += qty;
      else {
        counts.set(id, {
          productId: item.product_id ?? id,
          name: item.product_name_snapshot || "Product",
          value: qty,
        });
      }
    }
    topSold = [...counts.values()]
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }

  let topWishlisted: DashboardProductRank[] = [];
  const wishlistIds = (wishlistsRes.data ?? []).map((row) => row.id);
  if (wishlistIds.length) {
    const { data: wItems } = await supabase
      .from("wishlist_items")
      .select("product_id")
      .in("wishlist_id", wishlistIds);

    const counts = new Map<string, number>();
    for (const item of wItems ?? []) {
      if (!item.product_id) continue;
      counts.set(item.product_id, (counts.get(item.product_id) ?? 0) + 1);
    }
    const topIds = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (topIds.length) {
      const ids = topIds.map(([id]) => id);
      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .in("id", ids);
      const nameById = new Map(
        (products ?? []).map((row) => [row.id, row.name || "Product"]),
      );
      topWishlisted = topIds.map(([productId, value]) => ({
        productId,
        name: nameById.get(productId) ?? "Product",
        value,
      }));
    }
  }

  // Column/RPC missing until migration `20260921120000_product_view_count` is applied.
  const viewsAvailable = !viewedRes.error;
  const topViewed: DashboardProductRank[] = viewsAvailable
    ? (viewedRes.data ?? []).map((row) => ({
        productId: row.id,
        name: row.name || "Product",
        value: Number(row.view_count) || 0,
      }))
    : [];

  const reviewRows = reviewsRes.data ?? [];
  const byRatingMap = new Map<number, number>([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
  ]);
  let ratingSum = 0;
  let pending = 0;
  let approved = 0;
  const productAgg = new Map<
    string,
    { count: number; ratingSum: number }
  >();

  for (const row of reviewRows) {
    const rating = Number(row.rating) || 0;
    if (rating >= 1 && rating <= 5) {
      byRatingMap.set(rating, (byRatingMap.get(rating) ?? 0) + 1);
      ratingSum += rating;
    }
    if (row.status === "pending") pending += 1;
    if (row.status === "approved") approved += 1;

    if (row.product_id) {
      const prev = productAgg.get(row.product_id) ?? {
        count: 0,
        ratingSum: 0,
      };
      prev.count += 1;
      prev.ratingSum += rating;
      productAgg.set(row.product_id, prev);
    }
  }

  let byProduct: DashboardProductRank[] = [];
  if (productAgg.size) {
    const ids = [...productAgg.keys()];
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .in("id", ids);
    const nameById = new Map(
      (products ?? []).map((row) => [row.id, row.name || "Product"]),
    );
    byProduct = [...productAgg.entries()]
      .map(([productId, agg]) => ({
        productId,
        name: nameById.get(productId) ?? "Product",
        value: agg.count,
        meta: `avg ${(agg.ratingSum / agg.count).toFixed(1)}★`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }

  return {
    days,
    from,
    to,
    currency,
    ordersByDay,
    totals: {
      placed: totalsPlaced,
      paid: totalsPaid,
      delivered: totalsDelivered,
      revenue: totalsRevenue,
    },
    topSold,
    topWishlisted,
    topViewed,
    reviews: {
      total: reviewRows.length,
      pending,
      approved,
      avgRating: reviewRows.length
        ? Math.round((ratingSum / reviewRows.length) * 10) / 10
        : null,
      byRating: [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: byRatingMap.get(rating) ?? 0,
      })),
      byProduct,
    },
    viewsAvailable,
  };
}
