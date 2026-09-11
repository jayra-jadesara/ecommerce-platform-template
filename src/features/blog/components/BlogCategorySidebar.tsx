import Link from "next/link";
import type { StorefrontBlogCategory } from "@/features/blog/types";
import { cn } from "@/lib/cn";

type BlogCategorySidebarProps = {
  categories: StorefrontBlogCategory[];
  activeSlug?: string;
  /** Preserve search query when switching categories. */
  q?: string;
  /** Desktop sidebar vs mobile/top chips. */
  variant?: "sidebar" | "chips";
  className?: string;
};

function categoryHref(slug: string | null, q?: string): string {
  const params = new URLSearchParams();
  if (slug) params.set("category", slug);
  if (q?.trim()) params.set("q", q.trim());
  const qs = params.toString();
  return qs ? `/blog?${qs}` : "/blog";
}

export function BlogCategorySidebar({
  categories,
  activeSlug,
  q,
  variant = "sidebar",
  className,
}: BlogCategorySidebarProps) {
  if (!categories.length) return null;

  if (variant === "chips") {
    return (
      <nav className={cn(className)} aria-label="Blog categories">
        <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <li className="shrink-0">
            <Link
              href={categoryHref(null, q)}
              className={linkClass(!activeSlug, "chips")}
              aria-current={!activeSlug ? "page" : undefined}
            >
              All
            </Link>
          </li>
          {categories.map((category) => {
            const active = activeSlug === category.slug;
            return (
              <li key={category.id} className="shrink-0">
                <Link
                  href={categoryHref(category.slug, q)}
                  className={linkClass(active, "chips")}
                  aria-current={active ? "page" : undefined}
                >
                  <span>{category.name}</span>
                  <span className="ml-1.5 text-[0.7rem] opacity-70">
                    {category.postCount}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <aside className={cn("hidden md:block", className)} aria-label="Blog categories">
      <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
        Blog Categories
      </h2>
      <ul className="mt-3 space-y-1">
        <li>
          <Link
            href={categoryHref(null, q)}
            className={linkClass(!activeSlug, "sidebar")}
            aria-current={!activeSlug ? "page" : undefined}
          >
            All
          </Link>
        </li>
        {categories.map((category) => {
          const active = activeSlug === category.slug;
          return (
            <li key={category.id}>
              <Link
                href={categoryHref(category.slug, q)}
                className={linkClass(active, "sidebar")}
                aria-current={active ? "page" : undefined}
              >
                <span>{category.name}</span>
                <span className="ml-auto tabular-nums text-[var(--color-muted)]">
                  {category.postCount}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function linkClass(active: boolean, variant: "sidebar" | "chips"): string {
  if (variant === "chips") {
    return cn(
      "inline-flex min-h-11 items-center rounded-full border px-3.5 py-2 text-sm transition-colors",
      active
        ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] font-semibold text-[var(--color-foreground)]"
        : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] hover:text-[var(--color-foreground)]",
    );
  }
  return cn(
    "flex min-h-10 items-center gap-2 border-l-2 px-2.5 py-1.5 text-sm transition-colors",
    active
      ? "border-l-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] font-semibold text-[var(--color-foreground)]"
      : "border-l-transparent text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)] hover:text-[var(--color-foreground)]",
  );
}
