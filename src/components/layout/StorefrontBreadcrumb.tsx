import Link from "next/link";
import { cn } from "@/lib/cn";

export type StorefrontBreadcrumbItem = {
  label: string;
  /** Omit (or leave undefined) for the current page segment. */
  href?: string;
};

type StorefrontBreadcrumbProps = {
  items: StorefrontBreadcrumbItem[];
  className?: string;
};

/**
 * Compact storefront breadcrumb trail — shared across catalog, PDP, blog, account, etc.
 * Inline path (no boxed strip) so it sits quietly under the header.
 */
export function StorefrontBreadcrumb({
  items,
  className,
}: StorefrontBreadcrumbProps) {
  const trail = items
    .map((item) => ({
      label: item.label.trim(),
      href: item.href?.trim() || undefined,
    }))
    .filter((item) => item.label.length > 0);

  if (trail.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("sf-breadcrumb mb-3 md:mb-4", className)}
    >
      <ol className="sf-breadcrumb__list flex flex-wrap items-center gap-y-1">
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className="sf-breadcrumb__item inline-flex max-w-full items-center"
            >
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="sf-breadcrumb__sep mx-1.5 select-none text-[10px] text-[var(--color-muted)] opacity-60 sm:mx-2"
                >
                  /
                </span>
              ) : null}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="sf-breadcrumb__current line-clamp-1 text-[11px] font-semibold tracking-wide text-[var(--color-foreground)] sm:text-xs"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="sf-breadcrumb__link line-clamp-1 text-[11px] font-medium tracking-wide text-[var(--color-muted)] transition-colors hover:text-[var(--color-primary)] sm:text-xs"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
