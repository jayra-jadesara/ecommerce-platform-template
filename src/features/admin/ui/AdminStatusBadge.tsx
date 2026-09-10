import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "warning" | "error" | "info" | "neutral";

const TONE: Record<Tone, string> = {
  success:
    "bg-[color-mix(in_srgb,var(--color-success)_16%,transparent)] text-[var(--color-success)] ring-[color-mix(in_srgb,var(--color-success)_35%,transparent)]",
  warning:
    "bg-[color-mix(in_srgb,var(--color-warning)_18%,transparent)] text-[color-mix(in_srgb,var(--color-warning)_85%,var(--color-foreground))] ring-[color-mix(in_srgb,var(--color-warning)_40%,transparent)]",
  error:
    "bg-[color-mix(in_srgb,var(--color-error)_16%,transparent)] text-[var(--color-error)] ring-[color-mix(in_srgb,var(--color-error)_35%,transparent)]",
  info: "bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)] ring-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]",
  neutral:
    "bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] text-[var(--color-muted)] ring-[var(--color-border)]",
};

export function AdminStatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
