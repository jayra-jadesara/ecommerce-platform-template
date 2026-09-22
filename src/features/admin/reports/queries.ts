import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { orderStatusLabel } from "@/features/orders/state-machine";
import { resolveReportRange } from "@/features/admin/reports/report-range";
import type { OrderStatus } from "@/types/database";
import type {
  AdminReportBundle,
  ReportDayPoint,
  ReportInventoryRow,
  ReportProductRow,
  ReportRange,
} from "@/features/admin/reports/types";

const CAPTURED = "CAPTURED" as const;

const STATUS_ORDER: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

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

export type AdminReportQuery = {
  range?: string | null;
  from?: string | null;
  to?: string | null;
};

function emptySeries(from: string, to: string): ReportDayPoint[] {
  const out: ReportDayPoint[] = [];
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

function emptyBundle(range: ReportRange): AdminReportBundle {
  return {
    range,
    currency: "INR",
    revenue: {
      placed: 0,
      paid: 0,
      delivered: 0,
      revenue: 0,
      profit: 0,
      profitHasCostData: false,
      ordersByDay: emptySeries(range.from, range.to),
    },
    products: [],
    fulfillment: {
      byStatus: STATUS_ORDER.map((status) => ({
        status,
        label: orderStatusLabel(status),
        count: 0,
      })),
      totalInRange: 0,
      cancelled: 0,
      refunded: 0,
      cancelRate: 0,
      refundRate: 0,
    },
    inventory: { outOfStock: [], lowStock: [] },
    customersReviews: {
      paidBuyers: 0,
      guestPaidOrders: 0,
      reviews: {
        total: 0,
        pending: 0,
        approved: 0,
        avgRating: null,
        byRating: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: 0 })),
        byProduct: [],
      },
    },
  };
}

/**
 * Store-scoped management report data for PDF downloads.
 * Revenue uses CAPTURED payments only (same rule as dashboard).
 */
export async function getAdminReportBundle(
  storeId: string | null,
  options?: AdminReportQuery,
): Promise<AdminReportBundle> {
  const range = resolveReportRange(options);
  if (!storeId?.trim()) return emptyBundle(range);

  const supabase = createSupabaseServiceClient();
  const fromIso = `${range.from}T00:00:00.000Z`;
  const toIso = `${range.to}T23:59:59.999Z`;

  const [ordersRes, settingsRes, reviewsRes, inventoryRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, grand_total, currency, created_at, status, user_id")
      .eq("store_id", storeId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: true }),
    supabase
      .from("store_settings")
      .select("currency, inventory_low_stock_threshold")
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase
      .from("product_reviews")
      .select("id, rating, status, product_id, created_at")
      .eq("store_id", storeId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("inventory")
      .select(
        "quantity, reserved_quantity, low_stock_threshold, product_variants!inner(name, sku, track_inventory, is_active, products!inner(name, store_id))",
      )
      .eq("product_variants.products.store_id", storeId)
      .eq("product_variants.is_active", true)
      .eq("product_variants.track_inventory", true),
  ]);

  const orders = ordersRes.data ?? [];
  const currency =
    settingsRes.data?.currency ??
    orders.find((row) => row.currency)?.currency ??
    "INR";
  const storeThreshold =
    typeof settingsRes.data?.inventory_low_stock_threshold === "number"
      ? settingsRes.data.inventory_low_stock_threshold
      : 5;

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
    emptySeries(range.from, range.to).map((point) => [point.day, { ...point }]),
  );
  const statusCounts = new Map<string, number>();
  for (const status of STATUS_ORDER) statusCounts.set(status, 0);

  let totalsPlaced = 0;
  let totalsPaid = 0;
  let totalsDelivered = 0;
  let totalsRevenue = 0;
  let cancelled = 0;
  let refunded = 0;
  const paidBuyerIds = new Set<string>();
  let guestPaidOrders = 0;

  for (const order of orders) {
    const created = new Date(order.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const key = dayKey(created);
    const point = seriesMap.get(key);

    totalsPlaced += 1;
    if (point) point.placed += 1;

    const status = order.status;
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    if (status === "CANCELLED") cancelled += 1;
    if (status === "REFUNDED") refunded += 1;
    if (status === "DELIVERED") {
      totalsDelivered += 1;
      if (point) point.delivered += 1;
    }

    if (paidIds.has(order.id)) {
      totalsPaid += 1;
      const amount = Number(order.grand_total) || 0;
      totalsRevenue += amount;
      if (point) {
        point.paid += 1;
        point.revenue += amount;
      }
      if (order.user_id) paidBuyerIds.add(order.user_id);
      else guestPaidOrders += 1;
    }
  }

  const paidOrderIds = orders
    .filter((row) => paidIds.has(row.id))
    .map((row) => row.id);

  let products: ReportProductRow[] = [];
  let totalsProfit = 0;
  let profitHasCostData = false;

  if (paidOrderIds.length) {
    const { data: items } = await supabase
      .from("order_items")
      .select(
        "product_id, product_name_snapshot, quantity, line_total, variant_id",
      )
      .in("order_id", paidOrderIds);

    const counts = new Map<
      string,
      { productId: string; name: string; units: number; revenue: number }
    >();
    for (const item of items ?? []) {
      const id = item.product_id ?? item.product_name_snapshot;
      const prev = counts.get(id);
      const qty = Number(item.quantity) || 0;
      const line = Number(item.line_total) || 0;
      if (prev) {
        prev.units += qty;
        prev.revenue += line;
      } else {
        counts.set(id, {
          productId: item.product_id ?? id,
          name: item.product_name_snapshot || "Product",
          units: qty,
          revenue: line,
        });
      }
    }
    products = [...counts.values()]
      .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
      .slice(0, 25);

    const variantIds = [
      ...new Set(
        (items ?? [])
          .map((row) => row.variant_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const costByVariant = new Map<string, number>();
    if (variantIds.length) {
      const { data: variants } = await supabase
        .from("product_variants")
        .select("id, cost_price")
        .in("id", variantIds);
      for (const variant of variants ?? []) {
        if (variant.cost_price != null) {
          costByVariant.set(variant.id, Number(variant.cost_price) || 0);
          profitHasCostData = true;
        }
      }
    }
    let cogs = 0;
    for (const item of items ?? []) {
      if (!item.variant_id) continue;
      const unitCost = costByVariant.get(item.variant_id);
      if (unitCost == null) continue;
      cogs += unitCost * (Number(item.quantity) || 0);
    }
    totalsProfit = totalsRevenue - cogs;
  }

  const outOfStock: ReportInventoryRow[] = [];
  const lowStock: ReportInventoryRow[] = [];
  if (!inventoryRes.error) {
    for (const row of inventoryRes.data ?? []) {
      const variant = row.product_variants as unknown as {
        name: string;
        sku: string;
        products: { name: string; store_id: string };
      };
      const available = Math.max(
        0,
        (Number(row.quantity) || 0) - (Number(row.reserved_quantity) || 0),
      );
      const threshold = storeThreshold;
      const entry: ReportInventoryRow = {
        productName: variant?.products?.name || "Product",
        variantName: variant?.name || "Variant",
        sku: variant?.sku || "—",
        available,
        threshold,
      };
      if (available <= 0) outOfStock.push(entry);
      else if (available <= threshold) lowStock.push(entry);
    }
    outOfStock.sort((a, b) => a.productName.localeCompare(b.productName));
    lowStock.sort((a, b) => a.available - b.available);
  }

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

  let byProduct: AdminReportBundle["customersReviews"]["reviews"]["byProduct"] =
    [];
  if (productAgg.size) {
    const ids = [...productAgg.keys()];
    const { data: productRows } = await supabase
      .from("products")
      .select("id, name")
      .in("id", ids);
    const nameById = new Map(
      (productRows ?? []).map((row) => [row.id, row.name || "Product"]),
    );
    byProduct = [...productAgg.entries()]
      .map(([productId, agg]) => ({
        productId,
        name: nameById.get(productId) ?? "Product",
        count: agg.count,
        avgRating: Math.round((agg.ratingSum / agg.count) * 10) / 10,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }

  const totalInRange = orders.length;
  return {
    range,
    currency,
    revenue: {
      placed: totalsPlaced,
      paid: totalsPaid,
      delivered: totalsDelivered,
      revenue: totalsRevenue,
      profit: totalsProfit,
      profitHasCostData,
      ordersByDay: [...seriesMap.values()],
    },
    products,
    fulfillment: {
      byStatus: STATUS_ORDER.map((status) => ({
        status,
        label: orderStatusLabel(status),
        count: statusCounts.get(status) ?? 0,
      })),
      totalInRange,
      cancelled,
      refunded,
      cancelRate: totalInRange ? cancelled / totalInRange : 0,
      refundRate: totalInRange ? refunded / totalInRange : 0,
    },
    inventory: {
      outOfStock: outOfStock.slice(0, 80),
      lowStock: lowStock.slice(0, 80),
    },
    customersReviews: {
      paidBuyers: paidBuyerIds.size,
      guestPaidOrders,
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
    },
  };
}
