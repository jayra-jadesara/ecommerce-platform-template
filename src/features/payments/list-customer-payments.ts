import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export type CustomerPaymentListItem = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  provider: string;
  orderNumber: string;
};

export type CustomerPaymentListResult = {
  items: CustomerPaymentListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listCustomerPayments(input: {
  userId: string;
  page?: number;
  pageSize?: number;
  createdFromIso?: string;
  createdToIso?: string;
}): Promise<CustomerPaymentListResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("payments")
    .select(
      "id, status, amount, currency, created_at, provider, orders!inner(order_number)",
      { count: "exact" },
    )
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false });

  if (input.createdFromIso) {
    query = query.gte("created_at", input.createdFromIso);
  }
  if (input.createdToIso) {
    query = query.lte("created_at", input.createdToIso);
  }

  const { data, count, error } = await query.range(from, to);
  if (error) {
    return { items: [], total: 0, page, pageSize };
  }

  const items =
    data?.map((payment) => {
      const order = payment.orders as unknown as { order_number: string };
      return {
        id: payment.id,
        status: payment.status,
        amount: Number(payment.amount),
        currency: payment.currency,
        createdAt: payment.created_at,
        provider: payment.provider,
        orderNumber: order.order_number,
      };
    }) ?? [];

  return { items, total: count ?? 0, page, pageSize };
}
