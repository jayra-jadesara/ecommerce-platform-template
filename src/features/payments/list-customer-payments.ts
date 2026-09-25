import type { PaymentStatus } from "@/types/database";
import { effectivePaymentStatus } from "@/features/account/status-filters";
import {
  coercePaymentInstrument,
  type PaymentInstrument,
} from "@/features/payments/razorpay-instrument";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const MONEY_FINAL_STATUSES = ["CAPTURED", "AUTHORIZED", "REFUNDED"] as const;

export type CustomerPaymentListItem = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  provider: string;
  paymentMethod: string | null;
  instrument: PaymentInstrument | null;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  itemCount: number;
  /** Short product labels for the Items column (e.g. first 2 names). */
  itemSummary: string | null;
};

export type CustomerPaymentListResult = {
  items: CustomerPaymentListItem[];
  total: number;
  page: number;
  pageSize: number;
};

/** Mark unpaid payment rows Cancelled when their order is already Cancelled. */
async function healCancelledOrderPayments(userId: string) {
  const supabase = createSupabaseServiceClient();
  const { data: cancelledOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "CANCELLED");

  const orderIds = (cancelledOrders ?? []).map((row) => row.id);
  if (!orderIds.length) return;

  const { error } = await supabase
    .from("payments")
    .update({
      status: "CANCELLED",
      failure_reason: "Order cancelled.",
    })
    .eq("user_id", userId)
    .in("order_id", orderIds)
    .in("status", ["CREATED", "PENDING"]);

  if (error) {
    await supabase
      .from("payments")
      .update({
        status: "FAILED",
        failure_reason: "Order cancelled.",
      })
      .eq("user_id", userId)
      .in("order_id", orderIds)
      .in("status", ["CREATED", "PENDING"]);
  }
}

function isMoneyFinalStatus(status: string): boolean {
  return (MONEY_FINAL_STATUSES as readonly string[]).includes(
    status.trim().toUpperCase(),
  );
}

/** Unpaid cancelled orders are order history only — not a Payments ledger row. */
function shouldListOnPayments(input: {
  paymentStatus: string;
  orderStatus: string;
}): boolean {
  if (isMoneyFinalStatus(input.paymentStatus)) return true;
  return input.orderStatus.trim().toUpperCase() !== "CANCELLED";
}

export async function listCustomerPayments(input: {
  userId: string;
  page?: number;
  pageSize?: number;
  createdFromIso?: string;
  createdToIso?: string;
  status?: string | null;
}): Promise<CustomerPaymentListResult> {
  const { measureServerOperation } = await import("@/lib/perf/measure-server");
  return measureServerOperation("payments.listCustomer", async () => {
    await healCancelledOrderPayments(input.userId);

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 10));
    const statusFilter = (input.status ?? "all").trim().toUpperCase();

    const supabase = createSupabaseServiceClient();

    // Fetch a wider window then filter unpaid-cancelled out so pagination totals stay accurate.
    // Cap at a reasonable ledger size for account views.
    let query = supabase
      .from("payments")
      .select(
        "id, status, amount, currency, created_at, provider, payment_method, metadata, order_id, orders!inner(order_number, status)",
      )
      .eq("user_id", input.userId)
      .order("created_at", { ascending: false });

    if (input.createdFromIso) {
      query = query.gte("created_at", input.createdFromIso);
    }
    if (input.createdToIso) {
      query = query.lte("created_at", input.createdToIso);
    }

    if (statusFilter && statusFilter !== "ALL") {
      query = query.eq("status", statusFilter as PaymentStatus);
    }

    const { data, error } = await query.limit(500);
    if (error) {
      return { items: [], total: 0, page, pageSize };
    }

    const filtered = (data ?? []).filter((payment) => {
      const order = payment.orders as unknown as {
        order_number: string;
        status: string;
      };
      return shouldListOnPayments({
        paymentStatus: String(payment.status),
        orderStatus: order.status,
      });
    });

    const total = filtered.length;
    const from = (page - 1) * pageSize;
    const pageRows = filtered.slice(from, from + pageSize);
    const orderIds = pageRows.map((row) => row.order_id);

    const itemCountByOrder = new Map<string, number>();
    const namesByOrder = new Map<string, string[]>();

    if (orderIds.length) {
      const { data: itemRows } = await supabase
        .from("order_items")
        .select("order_id, product_name_snapshot, quantity")
        .in("order_id", orderIds);

      for (const row of itemRows ?? []) {
        const qty = Number(row.quantity) || 1;
        itemCountByOrder.set(
          row.order_id,
          (itemCountByOrder.get(row.order_id) ?? 0) + qty,
        );
        const names = namesByOrder.get(row.order_id) ?? [];
        if (names.length < 2 && row.product_name_snapshot?.trim()) {
          names.push(row.product_name_snapshot.trim());
          namesByOrder.set(row.order_id, names);
        }
      }
    }

    const items: CustomerPaymentListItem[] = pageRows.map((payment) => {
      const order = payment.orders as unknown as {
        order_number: string;
        status: string;
      };
      const rawStatus = payment.status as PaymentStatus | string;
      const names = namesByOrder.get(payment.order_id) ?? [];
      const itemCount = itemCountByOrder.get(payment.order_id) ?? 0;
      const itemSummary = names.length ? names.join(", ") : null;

      return {
        id: payment.id,
        status: effectivePaymentStatus({
          paymentStatus: rawStatus,
          orderStatus: order.status,
        }),
        amount: Number(payment.amount),
        currency: payment.currency,
        createdAt: payment.created_at,
        provider: payment.provider,
        paymentMethod: payment.payment_method ?? null,
        instrument: coercePaymentInstrument(payment.metadata),
        orderId: payment.order_id,
        orderNumber: order.order_number,
        orderStatus: order.status,
        itemCount,
        itemSummary,
      };
    });

    return { items, total, page, pageSize };
  });
}
