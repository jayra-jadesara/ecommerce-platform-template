"use client";

import { useQuery } from "@tanstack/react-query";
import { getFreeShippingHintAction } from "@/features/cart/shipping-hint";
import { formatMoney } from "@/features/catalog/money";

type Props = {
  currency: string;
};

/** Optional delivery info from Admin shipping configuration. */
export function DeliveryInfoBlock({ currency }: Props) {
  const hint = useQuery({
    queryKey: ["free-shipping-hint"],
    queryFn: () => getFreeShippingHintAction(),
    staleTime: 5 * 60_000,
  });

  if (!hint.data?.enabled) return null;

  const threshold = hint.data.thresholdMajor;

  return (
    <div className="rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
        Delivery
      </h2>
      <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-muted)]">
        {threshold != null && threshold > 0 ? (
          <li>
            Free delivery above {formatMoney(threshold, currency || hint.data.currency)}
          </li>
        ) : (
          <li>Delivery charges calculated when you Buy it now</li>
        )}
        <li>Secure payment with encryption</li>
      </ul>
    </div>
  );
}
