import type { ReactNode } from "react";
import { BackLink } from "@/components/layout/BackLink";
import { Container } from "@/components/layout/Container";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
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
  /** Page title alignment. Default left. */
  titleAlign?: "left" | "center";
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
  titleAlign = "left",
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
        <header
          className={cn(
            "mb-6 md:mb-8",
            titleAlign === "center" && "text-center",
          )}
        >
          {title ? (
            <StorefrontHeading
              title={title}
              as="h1"
              align={titleAlign}
              className="!text-2xl md:!text-3xl"
            />
          ) : null}
          {description ? (
            <p
              className={cn(
                "mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)] md:text-[0.95rem]",
                titleAlign === "center" && "mx-auto",
              )}
            >
              {description}
            </p>
          ) : null}
        </header>
      )}
      {children}
    </Container>
  );
}
