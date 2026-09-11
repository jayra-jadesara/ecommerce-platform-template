import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCurrentUser } from "@/features/auth/session";
import { formatMoney } from "@/features/catalog/money";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export default async function AccountPaymentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/payments");

  const supabase = createSupabaseServiceClient();
  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, status, amount, currency, created_at, provider, orders!inner(order_number)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Payments
      </h2>
      <div className="mt-6">
        {!payments?.length ? (
          <EmptyState
            title="No payments yet"
            description="Completed payments will appear here."
          />
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
            {payments.map((payment) => {
              const order = payment.orders as unknown as {
                order_number: string;
              };
              return (
                <li
                  key={payment.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {payment.provider} · {payment.status} ·{" "}
                      {formatDateTime(payment.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold">
                      {formatMoney(Number(payment.amount), payment.currency)}
                    </p>
                    {(payment.status === "CAPTURED" ||
                      payment.status === "AUTHORIZED") && (
                      <Link
                        href={`/payment/success?paymentId=${payment.id}`}
                        className="text-sm underline"
                      >
                        Receipt
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
