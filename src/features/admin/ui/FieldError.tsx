"use client";

import { cn } from "@/lib/cn";

type FieldErrorProps = {
  id?: string;
  message?: string | null;
  className?: string;
};

/**
 * Theme-aware field error (uses --color-error). Place below the input.
 */
export function FieldError({ id, message, className }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "field-error mt-1 text-sm text-[var(--color-error)]",
        className,
      )}
    >
      {message}
    </p>
  );
}

type FieldHintProps = {
  id?: string;
  children: React.ReactNode;
  className?: string;
};

export function FieldHint({ id, children, className }: FieldHintProps) {
  return (
    <p
      id={id}
      className={cn("mt-1 text-xs text-[var(--color-muted)]", className)}
    >
      {children}
    </p>
  );
}
