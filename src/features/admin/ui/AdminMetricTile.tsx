import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AdminCard } from "@/features/admin/ui/AdminCard";

type Tone = "neutral" | "primary" | "success" | "warning" | "error";

const TONE_ICON: Record<Tone, string> = {
  neutral:
    "bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] text-[var(--color-muted)]",
  primary:
    "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]",
  success:
    "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]",
  warning:
    "bg-[color-mix(in_srgb,var(--color-warning)_16%,transparent)] text-[color-mix(in_srgb,var(--color-warning)_88%,var(--color-foreground))]",
  error:
    "bg-[color-mix(in_srgb,var(--color-error)_14%,transparent)] text-[var(--color-error)]",
};

/**
 * Premium metric tile for dashboards and overview rows.
 * Display-only by default — avoid wrapping in navigation Links.
 * Uses theme CSS variables (--color-primary, --color-success, etc.).
 */
export function AdminMetricTile({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  compact = false,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: Tone;
  /** Tighter padding + type for dense overview rows. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <AdminCard
      padded={!compact}
      className={cn("h-full", compact && "p-3.5 md:p-4", className)}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]",
            compact ? "text-[10px]" : "text-[11px] tracking-[0.14em]",
          )}
        >
          {label}
        </p>
        {icon ? (
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg",
              compact ? "h-7 w-7" : "h-9 w-9 rounded-xl",
              TONE_ICON[tone],
            )}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "font-semibold tracking-tight tabular-nums text-[var(--color-foreground)]",
          compact
            ? "mt-2 text-[1.25rem] sm:text-[1.35rem]"
            : "mt-3 text-[1.65rem] sm:text-[1.75rem]",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p
          className={cn(
            "leading-snug text-[var(--color-muted)]",
            compact ? "mt-1 text-[11px]" : "mt-1.5 text-[12px]",
          )}
        >
          {hint}
        </p>
      ) : null}
    </AdminCard>
  );
}
