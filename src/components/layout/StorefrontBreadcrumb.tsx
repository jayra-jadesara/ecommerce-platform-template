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
 * Premium storefront breadcrumb strip — single visual language for catalog, PDP, blog, etc.
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
      className={cn(
        "sf-breadcrumb mb-5 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_65%,transparent)] py-2.5 md:rounded-md md:border md:px-4",
        className,
      )}
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--color-muted)]">
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-x-2">
              {index > 0 ? (
                <span aria-hidden="true" className="select-none opacity-50">
                  /
                </span>
              ) : null}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="line-clamp-1 font-medium text-[var(--color-foreground)]"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
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
