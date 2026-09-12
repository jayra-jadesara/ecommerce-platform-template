import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { getCurrentUser } from "@/features/auth/session";
import { formatMoney } from "@/features/catalog/money";
import { listCustomerOrders } from "@/features/orders/queries";
import { orderStatusLabel } from "@/features/orders/state-machine";
import { formatDateTime } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/orders");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await listCustomerOrders({
    userId: user.id,
    page,
    pageSize: 10,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div>
      <StorefrontHeading title="Orders" as="h2" align="left" className="!text-2xl" />
      <div className="mt-6">
        {!result.items.length ? (
          <EmptyState
            title="No orders yet"
            description="When you complete a purchase, your orders will show up here."
          />
        ) : (
          <div className="space-y-3">
            <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
              {result.items.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-[var(--color-surface)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {formatDateTime(order.createdAt)} ·{" "}
                        {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span>{orderStatusLabel(order.status)}</span>
                      <span className="font-semibold">
                        {formatMoney(order.grandTotal, order.currency)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {totalPages > 1 ? (
              <div className="flex items-center justify-between text-sm">
                <Link
                  href={`/account/orders?page=${Math.max(1, page - 1)}`}
                  className={page <= 1 ? "pointer-events-none opacity-40" : "underline"}
                >
                  Previous
                </Link>
                <span className="text-[var(--color-muted)]">
                  Page {page} of {totalPages}
                </span>
                <Link
                  href={`/account/orders?page=${Math.min(totalPages, page + 1)}`}
                  className={
                    page >= totalPages ? "pointer-events-none opacity-40" : "underline"
                  }
                >
                  Next
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
