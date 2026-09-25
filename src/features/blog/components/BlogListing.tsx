import { BlogArticleCard } from "@/features/blog/components/BlogArticleCard";
import { BlogCategoryFilter } from "@/features/blog/components/BlogCategoryFilter";
import { BlogCategorySidebar } from "@/features/blog/components/BlogCategorySidebar";
import { BlogPagination } from "@/features/blog/components/BlogPagination";
import { isListLayout } from "@/features/blog/settings-normalize";
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
  relatedPosts?: StorefrontBlogPostSummary[];
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
  relatedPosts = [],
  categorySlug,
  q,
}: BlogListingProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isList = isListLayout(settings);
  const coverGrid = usesCoverGrid(settings, isList);
  const listingLayout = isList ? "list" : "grid";

  const showCategories = settings.showCategories && categories.length > 0;
  const showSidebar = showCategories || relatedPosts.length > 0;
  const activeCategoryName = categorySlug
    ? categories.find((c) => c.slug === categorySlug)?.name
    : null;

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

  const postsBlock = isList ? (
    <ul className="divide-y divide-[var(--color-border)]">
      {posts.map((post) => (
        <li key={post.id} className="py-5 first:pt-0 last:pb-0">
          <BlogArticleCard
            post={post}
            {...cardFlags}
            featured={post.isFeatured}
          />
        </li>
      ))}
    </ul>
  ) : (
    <ul
      className={cn(
        "grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2",
        coverGrid
          ? "lg:grid-cols-3 xl:gap-x-5 xl:gap-y-8"
          : "lg:grid-cols-2",
      )}
    >
      {posts.map((post) => (
        <li key={post.id} className="min-w-0">
          <BlogArticleCard
            post={post}
            {...cardFlags}
            featured={post.isFeatured}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3">
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 shadow-sm">
        {showCategories || settings.showSearch ? (
          <BlogCategoryFilter
            categories={categories}
            activeSlug={categorySlug}
            q={q}
            showSearch={settings.showSearch}
          />
        ) : (
          <span className="text-xs text-[var(--color-muted)]">Articles</span>
        )}

        <p className="text-xs text-[var(--color-muted)]">
          {activeCategoryName ? (
            <>
              Showing{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                {activeCategoryName}
              </span>
            </>
          ) : total === 0 ? (
            "No articles"
          ) : (
            <>
              <span className="font-medium text-[var(--color-foreground)]">
                {total}
              </span>{" "}
              {total === 1 ? "article" : "articles"}
            </>
          )}
        </p>
      </div>

      <div
        className={cn(
          "relative z-0 grid gap-8",
          showSidebar
            ? "md:grid-cols-[13.5rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]"
            : null,
        )}
      >
        {showSidebar ? (
          <div className="min-w-0">
            {showCategories ? (
              <div className="mb-4 md:hidden">
                <BlogCategorySidebar
                  categories={categories}
                  activeSlug={categorySlug}
                  q={q}
                  relatedPosts={[]}
                  className="!space-y-0"
                />
              </div>
            ) : null}
            <div className="hidden md:block">
              <BlogCategorySidebar
                categories={showCategories ? categories : []}
                activeSlug={categorySlug}
                q={q}
                relatedPosts={relatedPosts}
                relatedTitle={
                  activeCategoryName
                    ? `More in ${activeCategoryName}`
                    : "Latest articles"
                }
              />
            </div>
          </div>
        ) : null}

        <div className="min-w-0">
          <p className="mb-2.5 text-xs text-[var(--color-muted)]">
            {total === 0
              ? "No articles match your filters."
              : `${total} ${total === 1 ? "article" : "articles"}`}
          </p>

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-12 text-center">
              <p className="font-medium text-[var(--color-foreground)]">
                No articles found
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {categorySlug || q
                  ? "Try clearing filters, or pick another topic."
                  : "Articles will appear here when your team publishes them."}
              </p>
            </div>
          ) : (
            postsBlock
          )}

          {total > 0 || posts.length > 0 ? (
            <BlogPagination
              page={page}
              totalPages={totalPages}
              hrefForPage={(p) => listingHref({ page: p, categorySlug, q })}
            />
          ) : null}

          {relatedPosts.length ? (
            <div className="mt-8 border-t border-[var(--color-border)] pt-6 md:hidden">
              <BlogCategorySidebar
                categories={[]}
                relatedPosts={relatedPosts}
                relatedTitle={
                  activeCategoryName
                    ? `More in ${activeCategoryName}`
                    : "Latest articles"
                }
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
