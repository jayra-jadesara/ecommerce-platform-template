import type { OrderStatus } from "@/types/database";
import { orderStatusLabel } from "@/features/orders/state-machine";
import { cn } from "@/lib/cn";

const STEPS: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
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

const SHORT: Record<(typeof STEPS)[number], string> = {
  PENDING: "Placed",
  CONFIRMED: "Paid",
  PROCESSING: "Pack",
  SHIPPED: "Ship",
  DELIVERED: "Done",
};

/**
 * Compact O—O—O progress for admin order list rows.
 */
export function OrderProgressDots({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <span
        className={cn(
          "inline-flex rounded-full bg-[color-mix(in_srgb,var(--color-error)_14%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-error)]",
          className,
        )}
      >
        {orderStatusLabel(status)}
      </span>
    );
  }

  const current = RANK[status] ?? 0;
  const complete = status === "DELIVERED";
  const accent = complete ? "var(--color-success)" : "var(--color-primary)";

  return (
    <div
      className={cn("min-w-[7.5rem]", className)}
      role="img"
      aria-label={`Progress: ${orderStatusLabel(status)}`}
      title={orderStatusLabel(status)}
      style={{ ["--progress-accent" as string]: accent }}
    >
      <div className="flex items-center gap-0.5">
        {STEPS.map((step, index) => {
          const done = index <= current;
          const active = index === current;
          const isLast = index === STEPS.length - 1;
          return (
            <div key={step} className="flex min-w-0 flex-1 items-center">
              <span
                className={cn(
                  "relative z-[1] h-2.5 w-2.5 shrink-0 rounded-full border",
                  done
                    ? "border-[var(--progress-accent)] bg-[var(--progress-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-card)]",
                  active &&
                    "ring-2 ring-[color-mix(in_srgb,var(--progress-accent)_25%,transparent)]",
                )}
              />
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    "mx-0.5 h-0.5 min-w-[0.35rem] flex-1 rounded-full",
                    index < current
                      ? "bg-[var(--progress-accent)]"
                      : "bg-[var(--color-border)]",
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <p
        className={cn(
          "mt-1 text-[10px] font-medium leading-none",
          complete
            ? "text-[var(--color-success)]"
            : "text-[var(--color-muted)]",
        )}
      >
        {SHORT[STEPS[Math.min(current, STEPS.length - 1)]!] ??
          orderStatusLabel(status)}
      </p>
    </div>
  );
}
