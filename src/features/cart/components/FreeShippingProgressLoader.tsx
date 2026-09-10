"use client";

import { useQuery } from "@tanstack/react-query";
import { FreeShippingProgress } from "@/features/cart/components/FreeShippingProgress";
import { getFreeShippingHintAction } from "@/features/cart/shipping-hint";

type Props = {
  subtotalMajor: number;
  currency: string;
  className?: string;
};

/** Fetches store shipping threshold and renders free-delivery progress. */
export function FreeShippingProgressLoader({
  subtotalMajor,
  currency,
  className,
}: Props) {
  const hint = useQuery({
    queryKey: ["free-shipping-hint"],
    queryFn: () => getFreeShippingHintAction(),
    staleTime: 5 * 60_000,
  });

  if (!hint.data?.enabled || hint.data.thresholdMajor == null) {
    return null;
  }

  return (
    <FreeShippingProgress
      subtotalMajor={subtotalMajor}
      currency={currency || hint.data.currency}
      thresholdMajor={hint.data.thresholdMajor}
      shippingEnabled={hint.data.enabled}
      className={className}
    />
  );
}
