import type { ReactNode } from "react";
import { BackLink } from "@/components/layout/BackLink";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/cn";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  /** Show a back control above the page title. Default true (home should set false). */
  showBack?: boolean;
  /** Fallback href when history cannot go back. */
  backHref?: string;
  backLabel?: string;
}

/** Consistent page chrome: optional back + heading block + constrained content. */
export function PageShell({
  children,
  className,
  title,
  description,
  showBack = true,
  backHref = "/",
  backLabel = "Back",
}: PageShellProps) {
  return (
    <Container
      as="main"
      className={cn("relative z-0 flex-1 pb-10 pt-8 md:pb-14 md:pt-10", className)}
    >
      {showBack ? (
        <div className="mb-5">
          <BackLink href={backHref} label={backLabel} />
        </div>
      ) : null}
      {(title || description) && (
        <header className="mb-6 md:mb-8">
          {title ? (
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--color-foreground)] md:text-3xl">
              {title}
            </h1>
          ) : null}
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)] md:text-[0.95rem]">
              {description}
            </p>
          ) : null}
        </header>
      )}
      {children}
    </Container>
  );
}
