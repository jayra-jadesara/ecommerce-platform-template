import Link from "next/link";
import { cn } from "@/lib/cn";

export type StorefrontPaginationProps = {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  className?: string;
};

/**
 * Storefront listing pagination — Prev / “Page X of Y” / Next.
 * Shared by blog and product catalog.
 */
export function StorefrontPagination({
  page,
  totalPages,
  hrefForPage,
  className,
}: StorefrontPaginationProps) {
  const pages = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, page), pages);
  const prevDisabled = current <= 1;
  const nextDisabled = current >= pages;

  return (
    <nav
      className={cn(
        "mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4 text-sm",
        className,
      )}
      aria-label="Pagination"
    >
      <Link
        href={hrefForPage(Math.max(1, current - 1))}
        aria-disabled={prevDisabled}
        tabIndex={prevDisabled ? -1 : undefined}
        className={cn(
          "inline-flex h-9 items-center rounded-xl border px-3 text-sm font-medium transition-colors",
          prevDisabled
            ? "pointer-events-none border-[var(--color-border)] text-[var(--color-muted)] opacity-40"
            : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)]",
        )}
      >
        Previous
      </Link>

      <span
        className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-button-foreground)]"
        aria-current="page"
      >
        Page {current} of {pages}
      </span>

      <Link
        href={hrefForPage(Math.min(pages, current + 1))}
        aria-disabled={nextDisabled}
        tabIndex={nextDisabled ? -1 : undefined}
        className={cn(
          "inline-flex h-9 items-center rounded-xl border px-3 text-sm font-medium transition-colors",
          nextDisabled
            ? "pointer-events-none border-[var(--color-border)] text-[var(--color-muted)] opacity-40"
            : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)]",
        )}
      >
        Next
      </Link>
    </nav>
  );
}
