import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

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
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-6 py-16 text-center",
        className,
      )}
      role="status"
    >
      <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
