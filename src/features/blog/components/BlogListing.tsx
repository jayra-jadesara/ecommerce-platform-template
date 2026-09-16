import { BlogArticleCard } from "@/features/blog/components/BlogArticleCard";
import { BlogCategorySidebar } from "@/features/blog/components/BlogCategorySidebar";
import { BlogPagination } from "@/features/blog/components/BlogPagination";
import {
  isListLayout,
  normalizeSidebarPreset,
  wantsFeaturedBlock,
} from "@/features/blog/settings-normalize";
import type {
  BlogSettings,
  StorefrontBlogCategory,
  StorefrontBlogPostSummary,
} from "@/features/blog/types";
import { cn } from "@/lib/cn";

type BlogListingProps = {
  settings: BlogSettings;
  posts: StorefrontBlogPostSummary[];
  total: number;
  page: number;
  pageSize: number;
  categories: StorefrontBlogCategory[];
  featured?: StorefrontBlogPostSummary | null;
  categorySlug?: string;
  q?: string;
};

function listingHref(input: {
  page?: number;
  categorySlug?: string;
  q?: string;
}): string {
  const params = new URLSearchParams();
  if (input.categorySlug) params.set("category", input.categorySlug);
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const qs = params.toString();
  return qs ? `/blog?${qs}` : "/blog";
}

function usesCoverGrid(settings: BlogSettings, isList: boolean): boolean {
  if (isList) return false;
  return settings.cardStyle !== "MINIMAL";
}

export function BlogListing({
  settings,
  posts,
  total,
  page,
  pageSize,
  categories,
  featured = null,
  categorySlug,
  q,
}: BlogListingProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilter = Boolean(categorySlug || q?.trim());
  const sidebarPosition = normalizeSidebarPreset(settings.sidebarPreset);
  const isList = isListLayout(settings);
  const coverGrid = usesCoverGrid(settings, isList);
  const listingLayout = isList ? "list" : "grid";

  const showFeaturedBlock =
    !coverGrid &&
    wantsFeaturedBlock(settings) &&
    Boolean(featured) &&
    page <= 1 &&
    !hasFilter;

  /** In cover grid, pin featured as the first card when present. */
  const gridPosts = (() => {
    if (coverGrid && featured && page <= 1 && !hasFilter) {
      const rest = posts.filter((post) => post.id !== featured.id);
      return [featured, ...rest];
    }
    if (showFeaturedBlock && featured) {
      return posts.filter((post) => post.id !== featured.id);
    }
    return posts;
  })();

  const showCategoryUi =
    settings.showCategories &&
    categories.length > 0 &&
    sidebarPosition !== "NONE";

  const useDesktopSidebar =
    showCategoryUi &&
    settings.showSidebar &&
    (sidebarPosition === "RIGHT" || sidebarPosition === "LEFT") &&
    !coverGrid;

  const useTopFilter =
    showCategoryUi &&
    (coverGrid ||
      sidebarPosition === "TOP" ||
      ((sidebarPosition === "RIGHT" || sidebarPosition === "LEFT") &&
        !settings.showSidebar));

  const cardFlags = {
    showCategories: settings.showCategories,
    showAuthor: settings.showAuthor,
    showDate: settings.showDate,
    showReadingTime: settings.showReadingTime,
    showFeaturedImage: settings.showFeaturedImage,
    cardStyle: settings.cardStyle,
    coverCtaStyle: settings.coverCtaStyle,
    listingLayout: listingLayout as "grid" | "list",
  };

  const sidebarOnLeft = useDesktopSidebar && sidebarPosition === "LEFT";

  const postsBlock = (
    <div>
      {isList ? (
        <ul className="divide-y divide-[var(--color-border)]">
          {gridPosts.map((post) => (
            <li key={post.id} className="py-7 first:pt-0 last:pb-0">
              <BlogArticleCard post={post} {...cardFlags} />
            </li>
          ))}
        </ul>
      ) : (
        <ul
          className={cn(
            "grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2",
            coverGrid
              ? "lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-6 xl:gap-y-12"
              : "sm:gap-x-7 sm:gap-y-11 lg:grid-cols-2",
          )}
        >
          {gridPosts.map((post, index) => (
            <li key={post.id} className="min-w-0 pt-3">
              <BlogArticleCard
                post={post}
                {...cardFlags}
                featured={Boolean(
                  featured && post.id === featured.id && index === 0,
                )}
              />
            </li>
          ))}
        </ul>
      )}

      <BlogPagination
        page={page}
        totalPages={totalPages}
        hrefForPage={(p) => listingHref({ page: p, categorySlug, q })}
      />
    </div>
  );

  const sidebar = useDesktopSidebar ? (
    <BlogCategorySidebar
      categories={categories}
      activeSlug={categorySlug}
      q={q}
      variant="sidebar"
      className={
        sidebarOnLeft
          ? "sticky top-24 border-r border-[var(--color-border)] pr-6"
          : "sticky top-24 border-l border-[var(--color-border)] pl-6"
      }
    />
  ) : null;

  return (
    <div className="space-y-8">
      {settings.showSearch ? (
        <form
          method="get"
          className={cn(
            "flex flex-col gap-3 sm:flex-row sm:items-center",
            coverGrid && "mx-auto max-w-xl",
          )}
        >
          {categorySlug ? (
            <input type="hidden" name="category" value={categorySlug} />
          ) : null}
          <label className="sr-only" htmlFor="blog-search">
            Search articles
          </label>
          <input
            id="blog-search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search articles"
            className="w-full min-h-11 flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm text-[var(--color-foreground)] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          />
          <button
            type="submit"
            className="min-h-11 rounded-full bg-[var(--color-primary)] px-6 py-2 text-sm font-semibold text-[var(--color-button-foreground)]"
          >
            Search
          </button>
        </form>
      ) : null}

      {useTopFilter || useDesktopSidebar ? (
        <div className={useDesktopSidebar ? "md:hidden" : undefined}>
          <BlogCategorySidebar
            categories={categories}
            activeSlug={categorySlug}
            q={q}
            variant="chips"
          />
        </div>
      ) : null}

      {showFeaturedBlock && featured ? (
        <section
          aria-label="Featured article"
          className="relative border-b border-[var(--color-border)] pb-10 pt-1"
        >
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Featured
          </p>
          <BlogArticleCard post={featured} {...cardFlags} featured />
        </section>
      ) : null}

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <p className="font-medium text-[var(--color-foreground)]">
            No articles yet
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--color-muted)] md:text-[0.95rem]">
            Articles will appear here when your team publishes them.
          </p>
        </div>
      ) : useDesktopSidebar ? (
        <div
          className={
            sidebarOnLeft
              ? "grid gap-10 lg:grid-cols-[minmax(12rem,22%)_minmax(0,1fr)] lg:items-start lg:gap-12"
              : "grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,26%)] lg:items-start lg:gap-12"
          }
        >
          {sidebarOnLeft ? (
            <>
              {sidebar}
              {postsBlock}
            </>
          ) : (
            <>
              {postsBlock}
              {sidebar}
            </>
          )}
        </div>
      ) : (
        postsBlock
      )}
    </div>
  );
}
