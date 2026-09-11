import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout";
import { getPlatformConfigAsync } from "@/config/site.server";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { BlogArticleCard } from "@/features/blog/components/BlogArticleCard";
import { BlogArticleCta } from "@/features/blog/components/BlogArticleCta";
import { BlogBreadcrumb } from "@/features/blog/components/BlogBreadcrumb";
import { BlogShareButtons } from "@/features/blog/components/BlogShareButtons";
import { BlogShopProducts } from "@/features/blog/components/BlogShopProducts";
import { MarkdownContent } from "@/features/blog/markdown";
import {
  getBlogSettingsCached,
  getPublishedBlogPostBySlug,
  listRelatedBlogPosts,
} from "@/features/blog/storefront";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import {
  buildBlogPostingJsonLd,
  buildBreadcrumbJsonLd,
  JsonLdScript,
} from "@/features/seo";
import { resolveBlogPostSeo } from "@/features/seo/resolve";
import { formatDateTime } from "@/lib/format-date";
import { metadataFromResolved } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site-url";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

async function loadLinkedProducts(
  productIds: string[],
): Promise<Array<{ id: string; name: string; slug: string }>> {
  if (!productIds.length) return [];
  const storeId = await resolveActiveStoreId();
  const supabase = createSupabasePublicClient();
  if (!storeId || !supabase) return [];

  const { data } = await supabase
    .from("products")
    .select("id, name, slug")
    .eq("store_id", storeId)
    .eq("status", "active")
    .in("id", productIds);

  if (!data?.length) return [];
  const byId = new Map(data.map((row) => [row.id, row]));
  return productIds
    .map((id) => byId.get(id))
    .filter((row): row is { id: string; name: string; slug: string } =>
      Boolean(row),
    );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [post, config] = await Promise.all([
    getPublishedBlogPostBySlug(slug),
    getPlatformConfigAsync(),
  ]);

  if (!post) {
    return metadataFromResolved(
      {
        title: "Article not found",
        description: config.seo.description,
        canonicalPath: `/blog/${slug}`,
        canonicalUrl: "",
        ogType: "article",
        robotsIndex: false,
        robotsFollow: false,
      },
      config.seo,
    );
  }

  const ogFromPath = post.ogImagePath
    ? resolveCmsImageUrl(post.ogImagePath)
    : null;

  const resolved = resolveBlogPostSeo({
    post: {
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      featuredImageUrl: post.featuredImageUrl,
      ogImageUrl: ogFromPath,
    },
    seo: config.seo,
    brandName: config.brand.name,
  });
  return metadataFromResolved(resolved, config.seo);
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([
    getPublishedBlogPostBySlug(slug),
    getBlogSettingsCached(),
  ]);
  if (!post) notFound();

  const categoryIds = post.categories.map((c) => c.id);
  const showRelatedPosts = settings?.showRelatedPosts !== false;
  const showRelatedProducts = settings?.showRelatedProducts !== false;

  const [related, linkedProducts] = await Promise.all([
    showRelatedPosts
      ? listRelatedBlogPosts(post.id, categoryIds, 3)
      : Promise.resolve([]),
    showRelatedProducts
      ? loadLinkedProducts(post.productIds)
      : Promise.resolve([]),
  ]);

  const showAuthor = settings?.showAuthor !== false;
  const showDate = settings?.showDate !== false;
  const showFeaturedImage = settings?.showFeaturedImage !== false;
  const showCategories = settings?.showCategories !== false;
  const showReadingTime = settings?.showReadingTime !== false;
  const showShare = settings?.showShareButtons !== false;
  const cardStyle = settings?.cardStyle ?? "STANDARD";

  const primaryCategory = post.categories[0];
  const imageUrl = post.featuredImageUrl?.trim() || null;
  const shareUrl = absoluteUrl(`/blog/${post.slug}`);
  const excerpt = post.excerpt?.trim() || null;

  const ogFromPath = post.ogImagePath
    ? resolveCmsImageUrl(post.ogImagePath)
    : null;
  const jsonLdImage =
    (ogFromPath && isAbsoluteUrl(ogFromPath) ? ogFromPath : null) ||
    (imageUrl && isAbsoluteUrl(imageUrl) ? imageUrl : null);

  const articleLd = buildBlogPostingJsonLd({
    title: post.title,
    description: post.seoDescription || post.excerpt,
    slug: post.slug,
    imageUrl: jsonLdImage,
    datePublished: post.publishedAt,
    authorName: post.authorName,
  });

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ];

  const bylineParts: string[] = [];
  if (showAuthor && post.authorName?.trim()) {
    bylineParts.push(post.authorName.trim());
  }
  if (
    showReadingTime &&
    post.readingTimeMinutes &&
    post.readingTimeMinutes > 0
  ) {
    bylineParts.push(`${post.readingTimeMinutes} min read`);
  }

  return (
    <Container
      as="main"
      className="relative z-0 flex-1 pb-12 pt-6 md:pb-16 md:pt-8"
    >
      <JsonLdScript data={[articleLd, buildBreadcrumbJsonLd(crumbs)]} />
      <BlogBreadcrumb current={post.title} />

      <article>
        <header className="mx-auto max-w-3xl">
          {(showCategories && primaryCategory) ||
          (showDate && post.publishedAt) ? (
            <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-[0.12em]">
              {showCategories && primaryCategory ? (
                <Link
                  href={`/blog?category=${encodeURIComponent(primaryCategory.slug)}`}
                  className="font-semibold uppercase text-[var(--color-primary)] hover:underline"
                >
                  {primaryCategory.name}
                </Link>
              ) : null}
              {showDate && post.publishedAt ? (
                <>
                  {showCategories && primaryCategory ? (
                    <span
                      aria-hidden="true"
                      className="text-[var(--color-muted)] opacity-40"
                    >
                      ·
                    </span>
                  ) : null}
                  <time
                    dateTime={post.publishedAt}
                    className="font-medium normal-case tracking-normal text-[var(--color-muted)]"
                  >
                    {formatDateTime(post.publishedAt)}
                  </time>
                </>
              ) : null}
            </p>
          ) : null}

          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--color-foreground)] md:text-4xl lg:text-[2.75rem] lg:leading-tight">
            {post.title}
          </h1>

          {excerpt ? (
            <p className="mt-3 text-base leading-relaxed text-[var(--color-muted)] md:text-lg">
              {excerpt}
            </p>
          ) : null}

          {bylineParts.length ? (
            <p className="mt-2.5 text-sm text-[var(--color-muted)]">
              {bylineParts.join(" · ")}
            </p>
          ) : null}
        </header>

        {showFeaturedImage && imageUrl ? (
          <div className="relative mx-auto mt-6 aspect-[16/9] max-w-5xl overflow-hidden rounded-[var(--radius-default,0.75rem)] bg-[color-mix(in_srgb,var(--color-surface)_80%,var(--color-border))] shadow-sm ring-1 ring-[var(--color-border)] md:mt-8 md:aspect-[2/1]">
            {isAbsoluteUrl(imageUrl) ? (
              <Image
                src={imageUrl}
                alt={post.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={post.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </div>
        ) : null}

        <div className="mx-auto mt-5 max-w-3xl md:mt-6">
          {showShare ? (
            <BlogShareButtons
              url={shareUrl}
              title={post.title}
              className="mb-5 border-b border-[var(--color-border)] pb-4"
            />
          ) : null}

          {post.content?.trim() ? (
            <div className="mx-auto max-w-[42rem] md:max-w-3xl">
              <MarkdownContent content={post.content} />
            </div>
          ) : (
            <p className="text-[var(--color-muted)]">
              This article has no content yet.
            </p>
          )}

          {linkedProducts.length ? (
            <BlogShopProducts products={linkedProducts} />
          ) : null}

          <BlogArticleCta
            title={settings?.ctaTitle ?? null}
            description={settings?.ctaDescription ?? null}
            buttonLabel={settings?.ctaButtonLabel ?? null}
            buttonHref={settings?.ctaButtonHref ?? null}
          />
        </div>
      </article>

      {related.length ? (
        <section
          className="mt-14 border-t border-[var(--color-border)] pt-10 md:mt-16"
          aria-labelledby="related-articles"
        >
          <h2
            id="related-articles"
            className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--color-foreground)] md:text-[1.65rem]"
          >
            Related articles
          </h2>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">
            More stories you may enjoy
          </p>
          <ul className="mt-7 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-7">
            {related.map((item) => (
              <li key={item.id} className="min-w-0">
                <BlogArticleCard
                  post={item}
                  showCategories={showCategories}
                  showAuthor={showAuthor}
                  showDate={showDate}
                  showReadingTime={showReadingTime}
                  showFeaturedImage={showFeaturedImage}
                  cardStyle={cardStyle}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
