import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-10 text-center",
        className,
      )}
      role="alert"
    >
      <h2 className="text-lg font-semibold text-[var(--color-error)]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{message}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
