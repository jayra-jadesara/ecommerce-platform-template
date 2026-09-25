import Link from "next/link";
import { cn } from "@/lib/cn";

type BlogPaginationProps = {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  className?: string;
};

function buildPageItems(
  current: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
}

/**
 * Product-style pagination inside the listing column — Prev / numbers / Next.
 */
export function BlogPagination({
  page,
  totalPages,
  hrefForPage,
  className,
}: BlogPaginationProps) {
  const pages = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, page), pages);
  const prevDisabled = current <= 1;
  const nextDisabled = current >= pages;
  const pageItems = buildPageItems(current, pages);

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

      <div className="flex flex-wrap items-center gap-1.5">
        {pageItems.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1.5 text-sm text-[var(--color-muted)]"
            >
              …
            </span>
          ) : (
            <Link
              key={item}
              href={hrefForPage(item)}
              aria-current={item === current ? "page" : undefined}
              className={cn(
                "inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-2.5 text-sm font-medium transition-colors",
                item === current
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                  : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)]",
              )}
            >
              {item}
            </Link>
          ),
        )}
      </div>

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
