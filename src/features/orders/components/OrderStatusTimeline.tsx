import type { OrderStatus } from "@/types/database";
import { orderStatusLabel } from "@/features/orders/state-machine";
import { cn } from "@/lib/cn";

const TIMELINE: Array<{ status: OrderStatus; label: string; hint: string }> = [
  { status: "PENDING", label: "Placed", hint: "Order received" },
  { status: "CONFIRMED", label: "Paid", hint: "Payment confirmed" },
  { status: "PROCESSING", label: "Processing", hint: "Packing your order" },
  { status: "SHIPPED", label: "Shipped", hint: "Handed to courier" },
  { status: "DELIVERED", label: "Delivered", hint: "Reached you" },
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
 * Premium O—O—O fulfillment stepper for customer order detail.
 * Statuses are updated manually by the store admin (no courier API required).
 */
export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <div
        className="rounded-[var(--radius-default,0.85rem)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-4 text-sm"
        role="status"
      >
        Status: <strong>{orderStatusLabel(status)}</strong>
      </div>
    );
  }

  const current = RANK[status] ?? 0;
  const complete = status === "DELIVERED";
  const accent = complete ? "var(--color-success)" : "var(--color-primary)";

  return (
    <div
      className="rounded-[var(--radius-default,0.85rem)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-5 sm:px-6"
      role="group"
      aria-label="Order progress"
      style={{ ["--progress-accent" as string]: accent }}
    >
      <p className="sr-only">Current status: {orderStatusLabel(status)}</p>
      <ol className="flex items-start justify-between gap-1">
        {TIMELINE.map((step, index) => {
          const done = index <= current;
          const active = index === current;
          const isLast = index === TIMELINE.length - 1;
          return (
            <li
              key={step.status}
              className="relative flex min-w-0 flex-1 flex-col items-center text-center"
            >
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[calc(50%+0.7rem)] right-[calc(-50%+0.7rem)] top-[0.7rem] h-0.5",
                    index < current
                      ? "bg-[var(--progress-accent)]"
                      : "bg-[var(--color-border)]",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-[1] flex h-6 w-6 items-center justify-center rounded-full border-2 text-[0.65rem] font-bold transition-colors",
                  done
                    ? "border-[var(--progress-accent)] bg-[var(--progress-accent)] text-white"
                    : "border-[var(--color-border)] bg-[var(--color-card)] text-transparent",
                  active &&
                    !complete &&
                    "ring-4 ring-[color-mix(in_srgb,var(--progress-accent)_18%,transparent)]",
                  complete &&
                    done &&
                    "ring-4 ring-[color-mix(in_srgb,var(--color-success)_18%,transparent)]",
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? "✓" : "•"}
              </span>
              <p
                className={cn(
                  "mt-2.5 text-[0.7rem] font-semibold leading-tight sm:text-xs",
                  complete && done
                    ? "text-[var(--color-success)]"
                    : active || done
                      ? "text-[var(--color-foreground)]"
                      : "text-[var(--color-muted)]",
                )}
              >
                {step.label}
              </p>
              <p className="mt-0.5 hidden text-[0.65rem] leading-snug text-[var(--color-muted)] sm:block">
                {step.hint}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
