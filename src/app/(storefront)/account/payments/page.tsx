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
  ACCOUNT_PAYMENT_STATUS_FILTERS,
  parseAccountPaymentStatusFilter,
} from "@/features/account/status-filters";
import { getCurrentUser } from "@/features/auth/session";
import { AccountPaymentsList } from "@/features/payments/components/AccountPaymentsList";
import { listCustomerPayments } from "@/features/payments/list-customer-payments";

export const dynamic = "force-dynamic";

export default async function AccountPaymentsPage({
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
  if (!user) redirect("/login?next=/account/payments");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const range = parseAccountDateRange(params.range);
  const status = parseAccountPaymentStatusFilter(params.status);
  const bounds = getAccountDateRangeBounds(range, {
    customFrom: params.from,
    customTo: params.to,
  });

  const result = await listCustomerPayments({
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
        title="Payments"
        as="h2"
        align="left"
        className="!text-2xl"
      />

      <div className="mt-4">
        <Suspense fallback={null}>
          <AccountDateRangeFilter
            statusOptions={ACCOUNT_PAYMENT_STATUS_FILTERS}
          />
        </Suspense>
      </div>

      <div className="mt-5">
        {!result.items.length ? (
          <EmptyState
            title={filtered ? "No payments found" : "No payments yet"}
            description={
              filtered
                ? "Try a different date or status filter."
                : "Completed payments will appear here."
            }
          />
        ) : (
          <>
            <AccountListPagination
              page={page}
              pageSize={result.pageSize}
              total={result.total}
              totalPages={totalPages}
              basePath="/account/payments"
              range={range}
              from={params.from}
              to={params.to}
              status={status === "all" ? undefined : status}
              noun="payments"
              className="mb-3"
            />
            <AccountPaymentsList payments={result.items} />
          </>
        )}
      </div>
    </div>
  );
}
