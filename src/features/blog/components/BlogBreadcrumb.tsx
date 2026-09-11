import Link from "next/link";

type BlogBreadcrumbProps = {
  /** Article title (post page). Takes precedence over categoryLabel / All. */
  current?: string;
  /** Active category name when filtering the listing. */
  categoryLabel?: string;
};

/**
 * Compact breadcrumb strip: Home / Blog / All|Category|Article.
 */
export function BlogBreadcrumb({ current, categoryLabel }: BlogBreadcrumbProps) {
  const trailLabel = current?.trim()
    ? current.trim()
    : categoryLabel?.trim()
      ? categoryLabel.trim()
      : "All";

  return (
    <nav
      aria-label="Breadcrumb"
      className="blog-page-header mb-5 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_65%,transparent)] py-2.5 md:rounded-md md:border md:px-4"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--color-muted)]">
        <li>
          <Link
            href="/"
            className="underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
          >
            Home
          </Link>
        </li>
        <li aria-hidden="true" className="select-none opacity-50">
          /
        </li>
        <li>
          <Link
            href="/blog"
            className="underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
          >
            Blog
          </Link>
        </li>
        <li aria-hidden="true" className="select-none opacity-50">
          /
        </li>
        <li>
          <span
            aria-current="page"
            className="line-clamp-1 font-medium text-[var(--color-foreground)]"
          >
            {trailLabel}
          </span>
        </li>
      </ol>
    </nav>
  );
}
