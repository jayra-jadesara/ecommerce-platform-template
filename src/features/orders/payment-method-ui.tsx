import { cn } from "@/lib/cn";
import {
  formatPaymentInstrumentLabel,
  type PaymentInstrument,
} from "@/features/payments/razorpay-instrument";

export type PaymentProviderKind = "cod" | "razorpay" | "other";

export function resolvePaymentProviderKind(
  provider: string | null | undefined,
): PaymentProviderKind {
  const value = (provider ?? "").trim().toLowerCase();
  if (value === "cod" || value === "cash_on_delivery") return "cod";
  if (value === "razorpay") return "razorpay";
  return "other";
}

/** Short chip label shown in headers / tabs (customer-facing). */
export function paymentMethodShortLabel(
  provider: string | null | undefined,
): string {
  switch (resolvePaymentProviderKind(provider)) {
    case "cod":
      return "COD";
    case "razorpay":
      return "Online";
    default:
      return provider?.trim() ? provider.trim() : "Payment";
  }
}

/** Longer label for detail rows (customer-facing). */
export function paymentMethodFullLabel(
  provider: string | null | undefined,
): string {
  switch (resolvePaymentProviderKind(provider)) {
    case "cod":
      return "Cash on Delivery";
    case "razorpay":
      return "Online payment";
    default:
      return provider?.trim() ? provider.trim() : "—";
  }
}

/**
 * Prefer instrument detail (card/UPI/bank); fall back to provider label.
 */
export function paymentInstrumentOrProviderLabel(input: {
  provider: string | null | undefined;
  paymentMethod?: string | null;
  instrument?: PaymentInstrument | null;
}): string {
  const instrumentLabel = formatPaymentInstrumentLabel(
    input.instrument,
    input.paymentMethod,
  );
  if (instrumentLabel) return instrumentLabel;
  return paymentMethodFullLabel(input.provider);
}

export { formatPaymentInstrumentLabel };

/**
 * Premium payment-method chip — success-tinted square badge.
 */
export function PaymentMethodBadge({
  provider,
  size = "md",
  className,
}: {
  provider: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const kind = resolvePaymentProviderKind(provider);
  const label = paymentMethodShortLabel(provider);
  const isCod = kind === "cod";
  const isRazorpay = kind === "razorpay";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
        size === "sm"
          ? "px-1.5 py-0.5 text-[0.65rem]"
          : "px-2 py-1 text-[0.7rem]",
        isCod || isRazorpay
          ? "bg-[color-mix(in_srgb,var(--color-success)_16%,transparent)] text-[var(--color-success)] ring-[color-mix(in_srgb,var(--color-success)_36%,transparent)]"
          : "bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] text-[var(--color-muted)] ring-[var(--color-border)]",
        className,
      )}
      title={paymentMethodFullLabel(provider)}
    >
      {label}
    </span>
  );
}
