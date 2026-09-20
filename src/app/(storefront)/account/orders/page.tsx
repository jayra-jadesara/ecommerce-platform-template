import { Suspense } from "react";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { AccountDateRangeFilter } from "@/features/account/components/AccountDateRangeFilter";
import { AccountListPagination } from "@/features/account/components/AccountListPagination";
import {
  getAccountDateRangeBounds,
  parseAccountDateRange,
} from "@/features/account/date-range";
import {
  ACCOUNT_ORDER_STATUS_FILTERS,
  parseAccountOrderStatusFilter,
} from "@/features/account/status-filters";
import { getCurrentUser } from "@/features/auth/session";
import { AccountOrdersList } from "@/features/orders/components/AccountOrdersList";
import { autoDeliverShippedOrders } from "@/features/orders/auto-deliver";
import { listCustomerOrders } from "@/features/orders/queries";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    range?: string;
    from?: string;
    to?: string;
    status?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/orders");

  await autoDeliverShippedOrders({ limit: 25 }).catch(() => null);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const range = parseAccountDateRange(params.range);
  const status = parseAccountOrderStatusFilter(params.status);
  const bounds = getAccountDateRangeBounds(range, {
    customFrom: params.from,
    customTo: params.to,
  });

  const result = await listCustomerOrders({
    userId: user.id,
    page,
    pageSize: 10,
    createdFromIso: bounds.fromIso,
    createdToIso: bounds.toIso,
    status: status === "all" ? null : status,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const filtered = range !== "all" || status !== "all";

  return (
    <div>
      <StorefrontHeading
        title="Orders"
        as="h2"
        align="left"
        className="!text-2xl"
      />

      <div className="mt-4">
        <Suspense fallback={null}>
          <AccountDateRangeFilter statusOptions={ACCOUNT_ORDER_STATUS_FILTERS} />
        </Suspense>
      </div>

      <div className="mt-5">
        {!result.items.length ? (
          <EmptyState
            title={filtered ? "No orders found" : "No orders yet"}
            description={
              filtered
                ? "Try a different date or status filter."
                : "When you complete a purchase, your orders will show up here."
            }
          />
        ) : (
          <>
            <AccountListPagination
              page={page}
              pageSize={result.pageSize}
              total={result.total}
              totalPages={totalPages}
              basePath="/account/orders"
              range={range}
              from={params.from}
              to={params.to}
              status={status === "all" ? undefined : status}
              noun="orders"
              className="mb-3"
            />
            <AccountOrdersList orders={result.items} />
          </>
        )}
      </div>
    </div>
  );
}
