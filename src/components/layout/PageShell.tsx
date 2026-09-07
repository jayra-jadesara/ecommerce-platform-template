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
    <Container as="main" className={cn("flex-1 py-8 md:py-12", className)}>
      {(title || description) && (
        <header className="mb-8 max-w-2xl">
          {title ? (
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--color-foreground)] md:text-4xl">
              {title}
            </h1>
          ) : null}
          {description ? (
            <p className="mt-3 text-base text-[var(--color-muted)]">
              {description}
            </p>
          ) : null}
        </header>
      )}
      {children}
    </Container>
  );
}
