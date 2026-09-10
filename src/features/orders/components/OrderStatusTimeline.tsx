import type { OrderStatus } from "@/types/database";
import { orderStatusLabel } from "@/features/orders/state-machine";
import { cn } from "@/lib/cn";

const TIMELINE: Array<{ status: OrderStatus; label: string }> = [
  { status: "PENDING", label: "Order placed" },
  { status: "CONFIRMED", label: "Payment confirmed" },
  { status: "PROCESSING", label: "Processing" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
];

const RANK: Record<OrderStatus, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELLED: -1,
  REFUNDED: -1,
};

/**
 * Customer-facing fulfillment timeline using only real order statuses.
 * Terminal CANCELLED / REFUNDED are shown as a single status note instead of inventing steps.
 */
export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <div
        className="rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm"
        role="status"
      >
        Status: <strong>{orderStatusLabel(status)}</strong>
      </div>
    );
  }

  const current = RANK[status] ?? 0;

  return (
    <ol className="grid gap-3 sm:grid-cols-5" aria-label="Order progress">
      {TIMELINE.map((step, index) => {
        const done = index <= current;
        const active = index === current;
        return (
          <li
            key={step.status}
            className={cn(
              "rounded-[var(--radius-default,0.5rem)] border px-3 py-3 text-center",
              done
                ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))]"
                : "border-[var(--color-border)] bg-[var(--color-card)] opacity-60",
            )}
          >
            <span
              className={cn(
                "mx-auto mb-2 flex h-2.5 w-2.5 rounded-full",
                done ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]",
              )}
              aria-hidden
            />
            <p
              className={cn(
                "text-xs font-semibold",
                active
                  ? "text-[var(--color-foreground)]"
                  : "text-[var(--color-muted)]",
              )}
            >
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
