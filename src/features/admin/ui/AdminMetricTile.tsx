import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AdminCard } from "@/features/admin/ui/AdminCard";

type Tone = "neutral" | "primary" | "secondary" | "success" | "warning" | "error";

const TONE_ICON: Record<Tone, string> = {
  neutral:
    "bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] text-[var(--color-muted)]",
  primary:
    "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]",
  secondary:
    "bg-[color-mix(in_srgb,var(--color-secondary)_14%,transparent)] text-[var(--color-secondary)]",
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
  /** Dense KPI chip — slightly smaller than default, still readable. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <AdminCard
      padded={!compact}
      className={cn(
        "h-full",
        compact &&
          "!rounded-xl border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] p-2.5 sm:p-3 shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_3%,transparent)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "font-semibold uppercase text-[var(--color-muted)]",
            compact
              ? "text-[10px] leading-tight tracking-[0.1em]"
              : "text-[11px] tracking-[0.14em]",
          )}
        >
          {label}
        </p>
        {icon ? (
          <span
            className={cn(
              "flex shrink-0 items-center justify-center [&_svg]:!text-[inherit]",
              compact
                ? "h-7 w-7 rounded-lg [&_svg]:!text-[15px]"
                : "h-9 w-9 rounded-xl",
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
            ? "mt-1.5 text-[1.125rem] leading-none sm:text-[1.25rem]"
            : "mt-3 text-[1.65rem] sm:text-[1.75rem]",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p
          className={cn(
            "leading-snug text-[var(--color-muted)]",
            compact
              ? "mt-1 line-clamp-2 text-[11px] leading-snug"
              : "mt-1.5 text-[12px]",
          )}
        >
          {hint}
        </p>
      ) : null}
    </AdminCard>
  );
}
