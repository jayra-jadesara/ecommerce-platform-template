import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { sfBtn } from "@/components/ui/storefront-classes";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-12 text-center shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_6%,transparent)] md:py-14",
        className,
      )}
      role="status"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, color-mix(in srgb, var(--color-primary) 14%, transparent), transparent 70%)",
        }}
      />
      <div className="relative">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-foreground)] md:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--color-muted)]">
            {description}
          </p>
        ) : null}
        {action ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 [&_a]:inline-flex [&_button]:inline-flex">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Convenience CTA class for empty-state actions. */
export function emptyStateCtaClass(
  variant: "primary" | "secondary" = "primary",
): string {
  return sfBtn(variant);
}
