import Link from "next/link";
import { cn } from "@/lib/cn";

type BlogPaginationProps = {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  className?: string;
};

/** Build a compact window of page numbers around the current page (~5 slots). */
export function paginationWindow(
  page: number,
  totalPages: number,
  windowSize = 5,
): number[] {
  if (totalPages <= 1) return [];
  const size = Math.max(1, Math.min(windowSize, totalPages));
  let start = Math.max(1, page - Math.floor(size / 2));
  let end = start + size - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - size + 1);
  }
  const pages: number[] = [];
  for (let p = start; p <= end; p += 1) pages.push(p);
  return pages;
}

export function BlogPagination({
  page,
  totalPages,
  hrefForPage,
  className,
}: BlogPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = paginationWindow(page, totalPages);
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav
      className={cn(
        "mt-10 flex flex-wrap items-center justify-center gap-2",
        className,
      )}
      aria-label="Pagination"
    >
      <Link
        href={hrefForPage(Math.max(1, page - 1))}
        aria-disabled={prevDisabled}
        tabIndex={prevDisabled ? -1 : undefined}
        className={cn(
          "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
          prevDisabled
            ? "pointer-events-none border-[var(--color-border)] opacity-40"
            : "border-[var(--color-border)] text-[var(--color-foreground)] hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]",
        )}
      >
        Previous
      </Link>

      <ol className="flex flex-wrap items-center gap-1.5">
        {pages.map((p) => {
          const current = p === page;
          return (
            <li key={p}>
              <Link
                href={hrefForPage(p)}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-semibold tabular-nums transition-colors",
                  current
                    ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-foreground)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] hover:text-[var(--color-foreground)]",
                )}
              >
                {p}
              </Link>
            </li>
          );
        })}
      </ol>

      <Link
        href={hrefForPage(Math.min(totalPages, page + 1))}
        aria-disabled={nextDisabled}
        tabIndex={nextDisabled ? -1 : undefined}
        className={cn(
          "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
          nextDisabled
            ? "pointer-events-none border-[var(--color-border)] opacity-40"
            : "border-[var(--color-border)] text-[var(--color-foreground)] hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]",
        )}
      >
        Next
      </Link>
    </nav>
  );
}
