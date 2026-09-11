import Image from "next/image";
import Link from "next/link";
import { formatDateTime } from "@/lib/format-date";
import type {
  BlogCardStyle,
  StorefrontBlogPostSummary,
} from "@/features/blog/types";
import { cn } from "@/lib/cn";

type BlogArticleCardProps = {
  post: StorefrontBlogPostSummary;
  showCategories?: boolean;
  showAuthor?: boolean;
  showDate?: boolean;
  showReadingTime?: boolean;
  showFeaturedImage?: boolean;
  cardStyle?: BlogCardStyle;
  /** Larger featured treatment at top of listing. */
  featured?: boolean;
};

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function CoverImage({
  src,
  alt,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  if (isAbsoluteUrl(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover transition-transform duration-500 ease-out motion-reduce:transform-none motion-safe:group-hover/image:scale-[1.03]"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out motion-reduce:transform-none motion-safe:group-hover/image:scale-[1.03]"
    />
  );
}

export function BlogArticleCard({
  post,
  showCategories = true,
  showAuthor = true,
  showDate = true,
  showReadingTime = false,
  showFeaturedImage = true,
  cardStyle = "STANDARD",
  featured = false,
}: BlogArticleCardProps) {
  const href = `/blog/${post.slug}`;
  const category = post.categories[0];
  const author = showAuthor ? post.authorName?.trim() : "";
  const dateLabel =
    showDate && post.publishedAt ? formatDateTime(post.publishedAt) : null;
  const readingLabel =
    showReadingTime &&
    post.readingTimeMinutes &&
    post.readingTimeMinutes > 0
      ? `${post.readingTimeMinutes} min read`
      : null;

  const imageUrl = post.featuredImageUrl?.trim() || null;
  const showImage = showFeaturedImage && Boolean(imageUrl);
  const minimal = cardStyle === "MINIMAL";
  const editorial = cardStyle === "EDITORIAL";

  return (
    <article
      className={cn(
        featured
          ? "group grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center md:gap-8 lg:gap-10"
          : "group flex h-full flex-col",
        editorial && !featured ? "gap-1" : null,
      )}
    >
      {showImage && imageUrl ? (
        <Link
          href={href}
          className={cn(
            "blog-card-image group/image relative block aspect-[16/10] overflow-hidden bg-[color-mix(in_srgb,var(--color-surface)_80%,var(--color-border))]",
            featured ? "md:min-h-[16rem] lg:min-h-[18rem]" : null,
            minimal
              ? "rounded-none"
              : "rounded-[var(--radius-default,0.75rem)]",
            !minimal &&
              "shadow-sm ring-1 ring-[var(--color-border)] transition-shadow duration-300 motion-safe:hover:shadow-md",
          )}
          aria-hidden={featured ? undefined : true}
          tabIndex={featured ? undefined : -1}
        >
          <CoverImage
            src={imageUrl}
            alt={featured ? post.title : ""}
            sizes={
              featured
                ? "(max-width: 768px) 100vw, 55vw"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            }
            priority={featured}
          />
        </Link>
      ) : null}

      <div
        className={
          featured ? "min-w-0" : "mt-4 flex min-w-0 flex-1 flex-col"
        }
      >
        {(showCategories && category) || dateLabel || author || readingLabel ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-[0.12em]">
            {showCategories && category ? (
              <span className="font-semibold uppercase text-[var(--color-primary)]">
                {category.name}
              </span>
            ) : null}
            {dateLabel ? (
              <>
                {showCategories && category ? (
                  <span
                    aria-hidden="true"
                    className="text-[var(--color-muted)] opacity-40"
                  >
                    ·
                  </span>
                ) : null}
                <span className="font-medium normal-case tracking-normal text-[var(--color-muted)]">
                  {dateLabel}
                </span>
              </>
            ) : null}
            {author ? (
              <>
                {(showCategories && category) || dateLabel ? (
                  <span
                    aria-hidden="true"
                    className="text-[var(--color-muted)] opacity-40"
                  >
                    ·
                  </span>
                ) : null}
                <span className="font-medium normal-case tracking-normal text-[var(--color-muted)]">
                  {author}
                </span>
              </>
            ) : null}
            {readingLabel ? (
              <>
                {(showCategories && category) || dateLabel || author ? (
                  <span
                    aria-hidden="true"
                    className="text-[var(--color-muted)] opacity-40"
                  >
                    ·
                  </span>
                ) : null}
                <span className="font-medium normal-case tracking-normal text-[var(--color-muted)]">
                  {readingLabel}
                </span>
              </>
            ) : null}
          </p>
        ) : null}

        <h2
          className={cn(
            "font-[family-name:var(--font-display)] font-semibold tracking-tight text-[var(--color-foreground)]",
            featured
              ? "mt-2.5 text-2xl md:text-3xl lg:text-[2.05rem] lg:leading-tight"
              : editorial
                ? "mt-3 text-[1.45rem] leading-snug md:text-[1.6rem]"
                : "mt-2 text-xl md:text-[1.35rem]",
          )}
        >
          <Link
            href={href}
            className="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {post.title}
          </Link>
        </h2>

        {post.excerpt?.trim() ? (
          <p
            className={cn(
              "mt-2 leading-relaxed text-[var(--color-muted)]",
              editorial
                ? "line-clamp-4 text-[0.95rem] md:text-base"
                : "line-clamp-3 text-sm md:text-[0.95rem]",
            )}
          >
            {post.excerpt.trim()}
          </p>
        ) : null}

        <p className={featured ? "mt-5" : "mt-auto pt-4"}>
          <Link
            href={href}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            Continue Reading
            <span aria-hidden="true">→</span>
            <span className="sr-only">: {post.title}</span>
          </Link>
        </p>
      </div>
    </article>
  );
}
