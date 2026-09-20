import type { OrderStatus } from "@/types/database";
import { orderStatusLabel } from "@/features/orders/state-machine";
import {
  paymentMethodShortLabel,
  resolvePaymentProviderKind,
} from "@/features/orders/payment-method-ui";
import { cn } from "@/lib/cn";

type TimelineStep = {
  status: OrderStatus;
  label: string;
  hint: string;
};

const ONLINE_TIMELINE: TimelineStep[] = [
  { status: "PENDING", label: "Placed", hint: "Order received" },
  { status: "CONFIRMED", label: "Paid", hint: "Payment confirmed" },
  { status: "PROCESSING", label: "Processing", hint: "Packing your order" },
  { status: "SHIPPED", label: "Shipped", hint: "Handed to courier" },
  { status: "DELIVERED", label: "Delivered", hint: "Reached you" },
];

/** COD: cash is collected on delivery — Paid is the final step. */
const COD_TIMELINE: TimelineStep[] = [
  { status: "PENDING", label: "Placed", hint: "Order received" },
  { status: "CONFIRMED", label: "Confirmed", hint: "Store accepted" },
  { status: "PROCESSING", label: "Processing", hint: "Packing" },
  { status: "SHIPPED", label: "Shipped", hint: "With courier" },
  { status: "DELIVERED", label: "Paid", hint: "Cash on delivery" },
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

function timelineForProvider(
  provider: string | null | undefined,
): TimelineStep[] {
  return resolvePaymentProviderKind(provider) === "cod"
    ? COD_TIMELINE
    : ONLINE_TIMELINE;
}

/**
 * Compact fulfillment stepper.
 * Online: Paid = CONFIRMED. COD: Paid = DELIVERED (cash on delivery).
 */
export function OrderStatusTimeline({
  status,
  paymentProvider,
}: {
  status: OrderStatus;
  paymentProvider?: string | null;
}) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <div
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-sm"
        role="status"
      >
        Status: <strong>{orderStatusLabel(status)}</strong>
      </div>
    );
  }

  const timeline = timelineForProvider(paymentProvider);
  const current = RANK[status] ?? 0;
  const complete = status === "DELIVERED";
  const accent = complete ? "var(--color-success)" : "var(--color-primary)";
  const isCod = resolvePaymentProviderKind(paymentProvider) === "cod";

  return (
    <div
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-3 sm:px-4"
      role="group"
      aria-label="Order progress"
      style={{ ["--progress-accent" as string]: accent }}
    >
      <p className="sr-only">Current status: {orderStatusLabel(status)}</p>
      {paymentProvider ? (
        <p className="mb-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
          {isCod
            ? "COD · paid at delivery"
            : `${paymentMethodShortLabel(paymentProvider)} · paid when confirmed`}
        </p>
      ) : null}
      <ol className="flex items-start justify-between gap-0.5">
        {timeline.map((step, index) => {
          const done = index <= current;
          const active = index === current;
          const isLast = index === timeline.length - 1;
          return (
            <li
              key={step.status}
              className="relative flex min-w-0 flex-1 flex-col items-center text-center"
            >
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[calc(50%+0.55rem)] right-[calc(-50%+0.55rem)] top-[0.55rem] h-px",
                    index < current
                      ? "bg-[var(--progress-accent)]"
                      : "bg-[var(--color-border)]",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-[1] flex h-5 w-5 items-center justify-center rounded-full border-2 text-[0.55rem] font-bold transition-colors",
                  done
                    ? "border-[var(--progress-accent)] bg-[var(--progress-accent)] text-white"
                    : "border-[var(--color-border)] bg-[var(--color-card)] text-transparent",
                  active &&
                    !complete &&
                    "ring-2 ring-[color-mix(in_srgb,var(--progress-accent)_20%,transparent)]",
                  complete &&
                    done &&
                    "ring-2 ring-[color-mix(in_srgb,var(--color-success)_20%,transparent)]",
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? "✓" : "•"}
              </span>
              <p
                className={cn(
                  "mt-1.5 text-[0.65rem] font-semibold leading-tight sm:text-[0.7rem]",
                  complete && done
                    ? "text-[var(--color-success)]"
                    : active || done
                      ? "text-[var(--color-foreground)]"
                      : "text-[var(--color-muted)]",
                )}
              >
                {step.label}
              </p>
              <p className="mt-0.5 hidden text-[0.6rem] leading-snug text-[var(--color-muted)] md:block">
                {step.hint}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
