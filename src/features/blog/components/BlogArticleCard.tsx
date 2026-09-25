import Image from "next/image";
import Link from "next/link";
import { formatDateTime } from "@/lib/format-date";
import type {
  BlogCardStyle,
  BlogCoverCtaStyle,
  StorefrontBlogPostSummary,
} from "@/features/blog/types";
import { CoverReadMoreBadge } from "@/features/blog/components/CoverReadMoreBadge";
import { cn } from "@/lib/cn";

type BlogArticleCardProps = {
  post: StorefrontBlogPostSummary;
  showCategories?: boolean;
  showAuthor?: boolean;
  showDate?: boolean;
  showReadingTime?: boolean;
  showFeaturedImage?: boolean;
  cardStyle?: BlogCardStyle;
  /** Cover card Read More badge: cookie / plain circle / text only. */
  coverCtaStyle?: BlogCoverCtaStyle;
  /** Larger featured treatment at top of listing. */
  featured?: boolean;
  /** Listing layout — grid uses cover cards (Britannia-inspired). */
  listingLayout?: "grid" | "list";
};

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function CoverImage({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (isAbsoluteUrl(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", className)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}

function usesCoverCard(
  cardStyle: BlogCardStyle,
  listingLayout: "grid" | "list",
): boolean {
  if (listingLayout === "list") return false;
  if (cardStyle === "MINIMAL") return false;
  // COVER, EDITORIAL, and STANDARD grid cards → impact cover layout
  return true;
}

function metaLine(parts: {
  showCategories: boolean;
  categoryName?: string;
  dateLabel: string | null;
  author: string;
  readingLabel: string | null;
}) {
  const { showCategories, categoryName, dateLabel, author, readingLabel } =
    parts;
  if (!(showCategories && categoryName) && !dateLabel && !author && !readingLabel) {
    return null;
  }

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-[0.12em]">
      {showCategories && categoryName ? (
        <span className="font-semibold uppercase text-[var(--color-primary)]">
          {categoryName}
        </span>
      ) : null}
      {dateLabel ? (
        <>
          {showCategories && categoryName ? (
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
          {(showCategories && categoryName) || dateLabel ? (
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
          {(showCategories && categoryName) || dateLabel || author ? (
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
  );
}

/** Britannia-inspired cover card — themed with store CSS variables. */
function CoverArticleCard({
  post,
  showCategories,
  featured,
  showFeaturedImage,
  coverCtaStyle = "COOKIE",
  priority,
}: {
  post: StorefrontBlogPostSummary;
  showCategories: boolean;
  featured: boolean;
  showFeaturedImage: boolean;
  coverCtaStyle?: BlogCoverCtaStyle;
  priority?: boolean;
}) {
  const href = `/blog/${post.slug}`;
  const category = post.categories[0];
  const imageUrl =
    showFeaturedImage && post.featuredImageUrl?.trim()
      ? post.featuredImageUrl.trim()
      : null;
  const tabLabel = featured
    ? "Featured"
    : showCategories && category
      ? category.name
      : "Story";

  return (
    <article className="blog-cover-card group relative h-full">
      <div
        className="pointer-events-none absolute left-1/2 top-0 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
        aria-hidden="true"
      >
        {featured ? (
          <span className="blog-cover-card__tab inline-block max-w-[11rem] truncate rounded-md bg-[var(--color-primary)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--color-button-foreground)] shadow-sm">
            Featured
          </span>
        ) : (
          <span className="blog-cover-card__tab inline-block max-w-[11rem] truncate rounded-md px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--color-button-foreground)] shadow-sm">
            {tabLabel}
          </span>
        )}
      </div>

      <Link
        href={href}
        className="blog-cover-card__surface relative flex aspect-[3/4] h-full min-h-[16rem] flex-col overflow-hidden rounded-[1.15rem] outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] sm:min-h-[18rem]"
      >
        <div className="absolute inset-0">
          {imageUrl ? (
            <CoverImage
              src={imageUrl}
              alt=""
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              priority={priority}
              className="transition-transform duration-700 ease-out motion-reduce:transform-none motion-safe:group-hover:scale-[1.04]"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 78%, #1a0a10), color-mix(in srgb, var(--color-secondary) 55%, var(--color-primary)), color-mix(in srgb, var(--color-accent) 35%, var(--color-primary)))",
              }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in srgb, #000 52%, transparent) 0%, color-mix(in srgb, #000 18%, transparent) 42%, color-mix(in srgb, #000 55%, transparent) 100%)",
            }}
            aria-hidden="true"
          />
        </div>

        <div className="relative z-10 flex flex-1 flex-col p-5 pt-8 sm:p-6 sm:pt-9">
          <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] font-bold leading-snug tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-[1.5rem] md:text-[1.55rem]">
            {post.title}
          </h2>
          {post.excerpt?.trim() ? (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/85 sm:line-clamp-4">
              {post.excerpt.trim()}
            </p>
          ) : null}

          <div className="mt-auto flex justify-center pb-1 pt-8">
            <CoverReadMoreBadge style={coverCtaStyle} />
          </div>
        </div>
        <span className="sr-only">: {post.title}</span>
      </Link>
    </article>
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
  coverCtaStyle = "COOKIE",
  featured = false,
  listingLayout = "grid",
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
  const showFeaturedLabel = featured || post.isFeatured;

  if (usesCoverCard(cardStyle, listingLayout)) {
    return (
      <CoverArticleCard
        post={post}
        showCategories={showCategories}
        featured={showFeaturedLabel}
        showFeaturedImage={showFeaturedImage}
        coverCtaStyle={coverCtaStyle}
        priority={showFeaturedLabel}
      />
    );
  }

  const horizontal = listingLayout === "list";

  return (
    <article
      className={cn(
        horizontal
          ? "group grid gap-3 sm:grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] sm:items-center sm:gap-3.5 md:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] md:gap-4"
          : "group flex h-full flex-col",
        editorial && !horizontal ? "gap-1" : null,
      )}
    >
      {showImage && imageUrl ? (
        <Link
          href={href}
          className={cn(
            "blog-card-image group/image relative block overflow-hidden bg-[color-mix(in_srgb,var(--color-surface)_80%,var(--color-border))]",
            horizontal
              ? "aspect-[4/3] max-h-[6.5rem] w-full sm:max-h-none"
              : "aspect-[16/10]",
            minimal
              ? "rounded-none"
              : "rounded-[var(--radius-default,0.75rem)]",
            !minimal &&
              "shadow-sm ring-1 ring-[var(--color-border)] transition-shadow duration-300 motion-safe:hover:shadow-md",
          )}
          aria-hidden={horizontal ? undefined : true}
          tabIndex={horizontal ? undefined : -1}
        >
          <CoverImage
            src={imageUrl}
            alt={horizontal ? post.title : ""}
            sizes={
              horizontal
                ? "(max-width: 640px) 100vw, 152px"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            }
            priority={showFeaturedLabel}
            className="transition-transform duration-500 ease-out motion-reduce:transform-none motion-safe:group-hover/image:scale-[1.03]"
          />
        </Link>
      ) : null}

      <div
        className={
          horizontal ? "min-w-0" : "mt-4 flex min-w-0 flex-1 flex-col"
        }
      >
        {showFeaturedLabel ? (
          <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Featured
          </p>
        ) : null}
        {metaLine({
          showCategories,
          categoryName: category?.name,
          dateLabel,
          author: author || "",
          readingLabel,
        })}

        <h2
          className={cn(
            "font-[family-name:var(--font-display)] font-semibold tracking-tight text-[var(--color-foreground)]",
            horizontal
              ? "mt-0.5 text-[0.95rem] leading-snug md:text-base"
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
              "mt-1 leading-relaxed text-[var(--color-muted)]",
              horizontal
                ? "line-clamp-2 text-[0.75rem] md:text-[0.8125rem]"
                : editorial
                  ? "line-clamp-4 text-[0.95rem] md:text-base"
                  : "line-clamp-3 text-sm md:text-[0.95rem]",
            )}
          >
            {post.excerpt.trim()}
          </p>
        ) : null}

        <p className={horizontal ? "mt-1.5" : "mt-auto pt-4"}>
          <Link
            href={href}
            className={cn(
              "inline-flex items-center gap-1 font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline",
              horizontal ? "min-h-7 text-[0.7rem]" : "min-h-11 text-sm",
            )}
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
