"use client";

import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { AdminDashboardAnalytics } from "@/features/admin/dashboard-analytics";
import { formatMoney } from "@/features/catalog/money";
import {
  ADMIN_CHART_COLORS,
  AdminChartCard,
  AdminHorizontalBarChart,
  AdminMultiBarChart,
  AdminVerticalBarChart,
} from "@/features/admin/ui/charts";
import { adminCard } from "@/features/admin/ui/admin-classes";
import { getAdminPath } from "@/config/admin-route";
import { cn } from "@/lib/cn";

const RANGE_OPTIONS = [
  { value: "7d", label: "7 days" },
  { value: "14d", label: "14 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
] as const;

function todayIso(): string {
  return dayjs().format("YYYY-MM-DD");
}

function addDaysIso(iso: string, delta: number): string {
  return dayjs(iso).add(delta, "day").format("YYYY-MM-DD");
}

function friendlyRangeLabel(from: string, to: string): string {
  const fmt = (iso: string) =>
    dayjs(iso).format("D MMM YYYY");
  return `${fmt(from)} – ${fmt(to)}`;
}

export function AdminDashboardCharts({
  analytics,
  range,
}: {
  analytics: AdminDashboardAnalytics;
  range: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setRange(nextRange: string) {
    const days =
      nextRange === "7d"
        ? 7
        : nextRange === "30d"
          ? 30
          : nextRange === "90d"
            ? 90
            : 14;
    const params = new URLSearchParams();
    params.set("range", nextRange);
    params.set("from", addDaysIso(todayIso(), -(days - 1)));
    params.set("to", todayIso());
    startTransition(() => {
      router.push(`${getAdminPath("/dashboard")}?${params.toString()}`);
    });
  }

  const hasOrderActivity = analytics.ordersByDay.some(
    (row) => row.placed > 0 || row.paid > 0,
  );

  const orderSeries = analytics.ordersByDay.map((row) => ({
    label: row.label,
    placed: row.placed,
    paid: row.paid,
    delivered: row.delivered,
    revenue: row.revenue,
  }));

  const soldSeries = analytics.topSold.map((row) => ({
    name: row.name,
    value: row.value,
  }));

  const wishlistSeries = analytics.topWishlisted.map((row) => ({
    name: row.name,
    value: row.value,
  }));

  const viewedSeries = analytics.topViewed.map((row) => ({
    name: row.name,
    value: row.value,
  }));

  const reviewProductSeries = analytics.reviews.byProduct.map((row) => ({
    name: row.name,
    value: row.value,
  }));

  const reviewStarsSeries = analytics.reviews.byRating.map((row) => ({
    label: `${row.rating}★`,
    value: row.count,
  }));

  return (
    <section aria-label="Store performance charts" className="space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Store performance
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">
            Same period for the totals and charts below ·{" "}
            {friendlyRangeLabel(analytics.from, analytics.to)}
          </p>
        </div>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Performance period"
        >
          {RANGE_OPTIONS.map((option) => {
            const active = range === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={pending}
                onClick={() => setRange(option.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-60",
                  active
                    ? "bg-[var(--color-button-background)] text-[var(--color-button-foreground)] shadow-sm"
                    : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted)] hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] hover:text-[var(--color-primary)]",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Placed", value: String(analytics.totals.placed) },
          { label: "Paid", value: String(analytics.totals.paid) },
          { label: "Done", value: String(analytics.totals.delivered) },
          {
            label: "Revenue",
            value: formatMoney(analytics.totals.revenue, analytics.currency),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn(adminCard(), "px-2.5 py-2")}
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">
              {stat.label}
            </p>
            <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-[var(--color-foreground)]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        <AdminChartCard
          title="Orders & revenue"
          tip="Placed · Paid · Delivered (done) · hover a day for revenue"
          className="lg:col-span-2"
          empty={hasOrderActivity ? null : "No orders in this period yet"}
        >
          <AdminMultiBarChart
            data={orderSeries}
            height={230}
            maxBarSize={16}
            series={[
              {
                key: "placed",
                label: "Placed",
                color: ADMIN_CHART_COLORS.muted,
                hoverColor: ADMIN_CHART_COLORS.mutedHover,
              },
              {
                key: "paid",
                label: "Paid",
                color: ADMIN_CHART_COLORS.primary,
                hoverColor: ADMIN_CHART_COLORS.primaryHover,
              },
              {
                key: "delivered",
                label: "Done",
                color: ADMIN_CHART_COLORS.success,
                hoverColor: ADMIN_CHART_COLORS.successHover,
              },
            ]}
            formatValue={(n, key) => {
              if (key === "placed") return `${n} placed`;
              if (key === "paid") return `${n} paid`;
              if (key === "delivered") return `${n} done`;
              return `${n}`;
            }}
            formatLabel={(label, point) => {
              const rev = Number(point.revenue) || 0;
              return `${label} · ${formatMoney(rev, analytics.currency)} paid`;
            }}
          />
          <p className="mt-2 text-[11px] text-[var(--color-muted)]">
            Paid revenue in range:{" "}
            <span className="font-semibold text-[var(--color-foreground)]">
              {formatMoney(analytics.totals.revenue, analytics.currency)}
            </span>
          </p>
        </AdminChartCard>

        <AdminChartCard
          title="Most bought products"
          tip="Units sold from paid orders"
          empty={soldSeries.length ? null : "No sold products yet"}
        >
          <AdminHorizontalBarChart
            data={soldSeries}
            color={ADMIN_CHART_COLORS.success}
            hoverColor={ADMIN_CHART_COLORS.successHover}
            valueLabel="Units"
            formatValue={(n) => `${n} sold`}
            labelMaxChars={16}
            yAxisWidth={112}
          />
        </AdminChartCard>

        <AdminChartCard
          title="Most wishlisted"
          tip="All-time saves (not limited by the period chips)"
          empty={wishlistSeries.length ? null : "No wishlist saves yet"}
        >
          <AdminHorizontalBarChart
            data={wishlistSeries}
            color={ADMIN_CHART_COLORS.primary}
            hoverColor={ADMIN_CHART_COLORS.primaryHover}
            valueLabel="Wishlist"
            formatValue={(n) => `${n} saves`}
            labelMaxChars={16}
            yAxisWidth={112}
          />
        </AdminChartCard>

        <AdminChartCard
          title="Reviews by product"
          tip={
            analytics.reviews.avgRating != null
              ? `Avg ${analytics.reviews.avgRating}★ · ${analytics.reviews.pending} pending · ${analytics.reviews.total} in range`
              : "Which products received reviews"
          }
          empty={
            reviewProductSeries.length
              ? null
              : "No product reviews in this period"
          }
        >
          <AdminHorizontalBarChart
            data={reviewProductSeries}
            color={ADMIN_CHART_COLORS.accent}
            hoverColor={ADMIN_CHART_COLORS.accentHover}
            valueLabel="Reviews"
            formatValue={(n) => `${n} reviews`}
            labelMaxChars={16}
            yAxisWidth={112}
          />
          {analytics.reviews.byProduct.length ? (
            <ul className="mt-2 space-y-1 border-t border-[var(--color-border)] pt-2">
              {analytics.reviews.byProduct.slice(0, 4).map((row) => (
                <li
                  key={row.productId}
                  className="flex items-baseline justify-between gap-2 text-[11px]"
                >
                  <span className="min-w-0 truncate font-medium text-[var(--color-foreground)]">
                    {row.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--color-muted)]">
                    {row.value} · {row.meta}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </AdminChartCard>

        <AdminChartCard
          title="Star ratings"
          tip="Distribution of review scores in this range"
          empty={
            analytics.reviews.total ? null : "No reviews in this period"
          }
        >
          <AdminVerticalBarChart
            data={reviewStarsSeries}
            height={200}
            color={ADMIN_CHART_COLORS.accent}
            hoverColor={ADMIN_CHART_COLORS.accentHover}
            valueLabel="Reviews"
            formatValue={(n) => `${n} reviews`}
            maxBarSize={36}
          />
        </AdminChartCard>

        <AdminChartCard
          title="Most viewed products"
          tip={
            analytics.viewsAvailable
              ? "All-time page opens (not limited by the period chips)"
              : "Needs product view tracking — run the view_count migration"
          }
          className="lg:col-span-2"
          empty={
            viewedSeries.length
              ? null
              : analytics.viewsAvailable
                ? "No views yet — open products on the storefront to start counting"
                : "View tracking isn’t set up for this store yet"
          }
        >
          <AdminHorizontalBarChart
            data={viewedSeries}
            color={ADMIN_CHART_COLORS.secondary}
            hoverColor={ADMIN_CHART_COLORS.secondaryHover}
            valueLabel="Views"
            formatValue={(n) => `${n} views`}
            labelMaxChars={22}
            yAxisWidth={140}
            height={200}
          />
        </AdminChartCard>
      </div>
    </section>
  );
}
