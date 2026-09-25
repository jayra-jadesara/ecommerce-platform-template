import Link from "next/link";
import type { StorefrontBlogPostSummary } from "@/features/blog/types";
import { cn } from "@/lib/cn";

type BlogPostAdjacentNavProps = {
  previous: StorefrontBlogPostSummary | null;
  next: StorefrontBlogPostSummary | null;
  className?: string;
};

/**
 * Prev / Next only — jumps directly to the adjacent published article.
 */
export function BlogPostAdjacentNav({
  previous,
  next,
  className,
}: BlogPostAdjacentNavProps) {
  if (!previous && !next) return null;

  return (
    <nav
      className={cn(
        "mt-10 flex items-stretch justify-between gap-4 border-t border-[var(--color-border)] pt-6",
        className,
      )}
      aria-label="Article navigation"
    >
      {previous ? (
        <Link
          href={`/blog/${previous.slug}`}
          className="group flex min-w-0 max-w-[48%] flex-col gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))]"
        >
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            ← Previous
          </span>
          <span className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
            {previous.title}
          </span>
        </Link>
      ) : (
        <span aria-hidden className="min-w-0 max-w-[48%] flex-1" />
      )}

      {next ? (
        <Link
          href={`/blog/${next.slug}`}
          className="group flex min-w-0 max-w-[48%] flex-col items-end gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-right transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))]"
        >
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Next →
          </span>
          <span className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
            {next.title}
          </span>
        </Link>
      ) : (
        <span aria-hidden className="min-w-0 max-w-[48%] flex-1" />
      )}
    </nav>
  );
}
