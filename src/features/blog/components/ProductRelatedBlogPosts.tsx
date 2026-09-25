import { BlogArticleCard } from "@/features/blog/components/BlogArticleCard";
import { isListLayout } from "@/features/blog/settings-normalize";
import type {
  BlogSettings,
  StorefrontBlogPostSummary,
} from "@/features/blog/types";
import { cn } from "@/lib/cn";

type ProductRelatedBlogPostsProps = {
  posts: StorefrontBlogPostSummary[];
  settings: BlogSettings | null;
  heading?: string;
  className?: string;
};

/**
 * Product detail blog strip — same heading/spacing as Related products,
 * article cards follow Blog settings layout (list / grid / cover).
 */
export function ProductRelatedBlogPosts({
  posts,
  settings,
  heading = "From our blog",
  className,
}: ProductRelatedBlogPostsProps) {
  if (!posts.length) return null;

  const isList = settings ? isListLayout(settings) : false;
  const listingLayout = isList ? "list" : "grid";
  const cardStyle = settings?.cardStyle ?? "STANDARD";
  const coverCtaStyle = settings?.coverCtaStyle ?? "COOKIE";
  const coverGrid = !isList && cardStyle !== "MINIMAL";

  const cardFlags = {
    showCategories: settings?.showCategories !== false,
    showAuthor: settings?.showAuthor !== false,
    showDate: settings?.showDate !== false,
    showReadingTime: settings?.showReadingTime !== false,
    showFeaturedImage: settings?.showFeaturedImage !== false,
    cardStyle,
    coverCtaStyle,
    listingLayout: listingLayout as "grid" | "list",
  };

  return (
    <section
      className={cn("mt-12 md:mt-14", className)}
      aria-labelledby="product-related-blog"
    >
      <h2
        id="product-related-blog"
        className="text-lg font-semibold text-[var(--color-foreground)] md:text-xl"
      >
        {heading}
      </h2>

      {isList ? (
        <ul className="mt-4 divide-y divide-[var(--color-border)]">
          {posts.map((post) => (
            <li key={post.id} className="py-4 first:pt-0 last:pb-0">
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
            "mt-4 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2",
            coverGrid
              ? "lg:grid-cols-3 xl:grid-cols-4"
              : "md:grid-cols-3 lg:grid-cols-4",
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
      )}
    </section>
  );
}
