import Link from "next/link";
import type {
  StorefrontBlogCategory,
  StorefrontBlogPostSummary,
} from "@/features/blog/types";
import { cn } from "@/lib/cn";

type BlogCategorySidebarProps = {
  categories: StorefrontBlogCategory[];
  activeSlug?: string;
  q?: string;
  /** Related / latest posts for the left rail. */
  relatedPosts?: StorefrontBlogPostSummary[];
  relatedTitle?: string;
  className?: string;
};

function categoryHref(slug: string | null, q?: string): string {
  const params = new URLSearchParams();
  if (slug) params.set("category", slug);
  if (q?.trim()) params.set("q", q.trim());
  const qs = params.toString();
  return qs ? `/blog?${qs}` : "/blog";
}

/**
 * Left rail: categories (with images) + related posts in the active topic.
 */
export function BlogCategorySidebar({
  categories,
  activeSlug,
  q,
  relatedPosts = [],
  relatedTitle = "Related articles",
  className,
}: BlogCategorySidebarProps) {
  if (!categories.length && !relatedPosts.length) return null;

  return (
    <aside
      className={cn("space-y-8", className)}
      aria-label="Blog topics and related articles"
    >
      {categories.length ? (
        <div>
          <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
            Categories
          </h2>
          <ul className="mt-3 space-y-0.5">
            <li>
              <Link
                href={categoryHref(null, q)}
                className={catLinkClass(!activeSlug)}
                aria-current={!activeSlug ? "page" : undefined}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-surface)] text-[10px] font-semibold text-[var(--color-muted)] ring-1 ring-[var(--color-border)]">
                  All
                </span>
                <span className="min-w-0 flex-1 truncate">All articles</span>
              </Link>
            </li>
            {categories.map((category) => {
              const active = activeSlug === category.slug;
              const thumb = category.imageUrl?.trim() || null;
              return (
                <li key={category.id}>
                  <Link
                    href={categoryHref(category.slug, q)}
                    className={catLinkClass(active)}
                    aria-current={active ? "page" : undefined}
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-md object-cover ring-1 ring-[var(--color-border)]"
                      />
                    ) : (
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface))] text-[10px] font-semibold text-[var(--color-primary)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_20%,var(--color-border))]"
                        aria-hidden
                      >
                        {category.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {category.name}
                    </span>
                    <span className="tabular-nums text-[11px] text-[var(--color-muted)]">
                      {category.postCount}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {relatedPosts.length ? (
        <div>
          <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
            {relatedTitle}
          </h2>
          <ul className="mt-3 space-y-3">
            {relatedPosts.map((post) => {
              const thumb = post.featuredImageUrl?.trim() || null;
              return (
                <li key={post.id}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group flex gap-2.5 rounded-lg p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-12 w-14 shrink-0 rounded-md object-cover ring-1 ring-[var(--color-border)]"
                      />
                    ) : (
                      <div className="h-12 w-14 shrink-0 rounded-md bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_55%,#1a1012),#1a1012)] ring-1 ring-[var(--color-border)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[0.8125rem] font-semibold leading-snug text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
                        {post.title}
                      </p>
                      {post.categories[0]?.name ? (
                        <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-primary)]">
                          {post.categories[0].name}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}

function catLinkClass(active: boolean): string {
  return cn(
    "flex min-h-11 items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-sm transition-colors",
    active
      ? "bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] font-semibold text-[var(--color-foreground)]"
      : "text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)] hover:text-[var(--color-foreground)]",
  );
}
