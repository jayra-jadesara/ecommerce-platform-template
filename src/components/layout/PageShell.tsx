import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/cn";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

/** Consistent page chrome: optional heading block + constrained content. */
export function PageShell({
  children,
  className,
  title,
  description,
}: PageShellProps) {
  return (
    <Container as="main" className={cn("flex-1 py-4 md:py-6", className)}>
      {(title || description) && (
        <header className="mb-4 md:mb-6">
          {title ? (
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)] md:text-3xl">
              {title}
            </h1>
          ) : null}
          {description ? (
            <p className="mt-2 text-sm text-[var(--color-muted)] md:text-base">
              {description}
            </p>
          ) : null}
        </header>
      )}
      {children}
    </Container>
  );
}
