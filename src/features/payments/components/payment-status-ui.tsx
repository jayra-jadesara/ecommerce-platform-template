import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PaymentStatusTone = "success" | "error" | "warning" | "neutral";

const SUCCESS_PAYMENT = new Set(["CAPTURED", "AUTHORIZED"]);
const SUCCESS_ORDER = new Set([
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
]);
const ERROR_PAYMENT = new Set(["FAILED", "CANCELLED"]);
const ERROR_ORDER = new Set(["CANCELLED", "REFUNDED"]);

export function paymentStatusTone(status: string): PaymentStatusTone {
  const value = status.trim().toUpperCase();
  if (SUCCESS_PAYMENT.has(value)) return "success";
  if (ERROR_PAYMENT.has(value)) return "error";
  if (value === "PENDING" || value === "CREATED") return "warning";
  return "neutral";
}

export function orderStatusTone(status: string): PaymentStatusTone {
  const value = status.trim().toUpperCase();
  if (SUCCESS_ORDER.has(value)) return "success";
  if (ERROR_ORDER.has(value)) return "error";
  if (value === "PENDING") return "warning";
  return "neutral";
}

const TONE_PILL: Record<PaymentStatusTone, string> = {
  success:
    "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)] ring-[color-mix(in_srgb,var(--color-success)_32%,transparent)]",
  error:
    "bg-[color-mix(in_srgb,var(--color-error)_12%,transparent)] text-[var(--color-error)] ring-[color-mix(in_srgb,var(--color-error)_30%,transparent)]",
  warning:
    "bg-[color-mix(in_srgb,var(--color-warning)_14%,transparent)] text-[color-mix(in_srgb,var(--color-warning)_80%,var(--color-foreground))] ring-[color-mix(in_srgb,var(--color-warning)_35%,transparent)]",
  neutral:
    "bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)] text-[var(--color-muted)] ring-[var(--color-border)]",
};

const TONE_ICON: Record<PaymentStatusTone, string> = {
  success: "bg-[var(--color-success)] text-white",
  error: "bg-[var(--color-error)] text-white",
  warning:
    "bg-[color-mix(in_srgb,var(--color-warning)_85%,var(--color-foreground))] text-white",
  neutral: "bg-[var(--color-muted)] text-white",
};

function StatusIcon({ tone }: { tone: PaymentStatusTone }) {
  if (tone === "success") {
    return <CheckRoundedIcon className="!text-[0.85rem]" aria-hidden />;
  }
  if (tone === "error") {
    return <CloseRoundedIcon className="!text-[0.85rem]" aria-hidden />;
  }
  return null;
}

export function StatusPill({
  status,
  tone,
  className,
}: {
  status: string;
  tone: PaymentStatusTone;
  className?: string;
}) {
  const icon = <StatusIcon tone={tone} />;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.06em] ring-1 ring-inset",
        TONE_PILL[tone],
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            "inline-flex h-4 w-4 items-center justify-center rounded-full",
            TONE_ICON[tone],
          )}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      {status}
    </span>
  );
}

export function PaymentMetaLine({
  provider,
  status,
  dateLabel,
}: {
  provider: string;
  status: string;
  dateLabel: string;
}): ReactNode {
  const tone = paymentStatusTone(status);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-[var(--color-muted)]">
      <span className="capitalize">{provider}</span>
      <span aria-hidden className="text-[var(--color-border)]">
        ·
      </span>
      <StatusPill status={status} tone={tone} />
      <span aria-hidden className="text-[var(--color-border)]">
        ·
      </span>
      <span>{dateLabel}</span>
    </div>
  );
}
