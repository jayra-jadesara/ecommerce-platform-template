import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container, StorefrontBreadcrumb } from "@/components/layout";
import { getPlatformConfigAsync } from "@/config/site.server";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { BlogArticleCta } from "@/features/blog/components/BlogArticleCta";
import { BlogCategorySidebar } from "@/features/blog/components/BlogCategorySidebar";
import { BlogPostAdjacentNav } from "@/features/blog/components/BlogPostAdjacentNav";
import { BlogShareButtons } from "@/features/blog/components/BlogShareButtons";
import { BlogShopProducts } from "@/features/blog/components/BlogShopProducts";
import { MarkdownContent } from "@/features/editor";
import {
  getAdjacentBlogPosts,
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
import { getCurrentUser } from "@/features/auth/session";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

type LinkedProductRow = {
  id: string;
  name: string;
  slug: string;
  defaultVariantId: string | null;
};

async function loadLinkedProducts(
  productIds: string[],
): Promise<LinkedProductRow[]> {
  if (!productIds.length) return [];
  const storeId = await resolveActiveStoreId();
  const supabase = createSupabasePublicClient();
  if (!storeId || !supabase) return [];

  const { data } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      product_variants (
        id,
        is_active,
        sort_order
      )
    `,
    )
    .eq("store_id", storeId)
    .eq("status", "active")
    .in("id", productIds);

  if (!data?.length) return [];

  type VariantJoin = {
    id: string;
    is_active: boolean | null;
    sort_order: number | null;
  };

  const mapped: LinkedProductRow[] = data.map((row) => {
    const variants = (
      (row.product_variants as unknown as VariantJoin[] | null) ?? []
    )
      .filter((v) => v.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      defaultVariantId: variants[0]?.id ?? null,
    };
  });

  const byId = new Map(mapped.map((row) => [row.id, row]));
  return productIds
    .map((id) => byId.get(id))
    .filter((row): row is LinkedProductRow => Boolean(row));
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
  const [post, settings, config, user] = await Promise.all([
    getPublishedBlogPostBySlug(slug),
    getBlogSettingsCached(),
    getPlatformConfigAsync(),
    getCurrentUser(),
  ]);
  if (!post) notFound();

  const isAuthenticated = Boolean(user);
  const categoryIds = post.categories.map((c) => c.id);
  const showRelatedPosts = settings?.showRelatedPosts !== false;
  const showRelatedProducts = settings?.showRelatedProducts !== false;

  const [related, linkedProducts, adjacent] = await Promise.all([
    showRelatedPosts
      ? listRelatedBlogPosts(post.id, categoryIds, 6)
      : Promise.resolve([]),
    showRelatedProducts
      ? loadLinkedProducts(post.productIds)
      : Promise.resolve([]),
    getAdjacentBlogPosts(post.id, post.publishedAt),
  ]);

  const showAuthor = settings?.showAuthor !== false;
  const showDate = settings?.showDate !== false;
  const showFeaturedImage = settings?.showFeaturedImage !== false;
  const showCategories = settings?.showCategories !== false;
  const showReadingTime = settings?.showReadingTime !== false;
  const showShare = settings?.showShareButtons !== false;

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

  const relatedTitle = primaryCategory
    ? `More in ${primaryCategory.name}`
    : "Related articles";

  return (
    <main className="relative z-0 flex-1 pb-12 md:pb-16">
      <JsonLdScript data={[articleLd, buildBreadcrumbJsonLd(crumbs)]} />
      <Container className="pt-6 md:pt-8">
        <StorefrontBreadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Blog", href: "/blog" },
            { label: post.title },
          ]}
        />
      </Container>

      <article>
        <header className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-foreground)]">
            {showCategories && primaryCategory
              ? primaryCategory.name
              : "Our stories"}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--color-primary)] md:text-4xl lg:text-[2.85rem] lg:leading-tight">
            {post.title}
          </h1>
          {excerpt ? (
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-muted)] md:text-lg">
              {excerpt}
            </p>
          ) : null}
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            {[
              showDate && post.publishedAt
                ? formatDateTime(post.publishedAt)
                : null,
              ...bylineParts,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </header>

        {showFeaturedImage && imageUrl ? (
          <div className="relative mx-auto mt-8 w-full max-w-5xl px-4 sm:px-6 md:mt-10">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[1.5rem] bg-[color-mix(in_srgb,var(--color-surface)_80%,var(--color-border))] shadow-[0_20px_48px_color-mix(in_srgb,var(--color-foreground)_12%,transparent)] ring-1 ring-[var(--color-border)] md:aspect-[2/1]">
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
          </div>
        ) : null}

        <Container className="mt-6 md:mt-8">
          <div
            className={
              related.length
                ? "mx-auto grid max-w-6xl gap-8 md:grid-cols-[14rem_minmax(0,1fr)] lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-10"
                : "mx-auto max-w-3xl"
            }
          >
            {related.length ? (
              <div className="min-w-0">
                <div className="hidden md:block md:sticky md:top-24">
                  <BlogCategorySidebar
                    categories={[]}
                    relatedPosts={related}
                    relatedTitle={relatedTitle}
                  />
                </div>
              </div>
            ) : null}

            <div className="min-w-0">
              {showShare ? (
                <BlogShareButtons
                  url={shareUrl}
                  title={post.title}
                  profiles={{
                    instagram: config.social.instagram,
                    youtube: config.social.youtube,
                  }}
                  className="mb-6 border-b border-[var(--color-border)] pb-5"
                />
              ) : null}

              {post.content?.trim() ? (
                <div className="max-w-[42rem] md:max-w-none">
                  <MarkdownContent content={post.content} />
                </div>
              ) : (
                <p className="text-[var(--color-muted)]">
                  This article has no content yet.
                </p>
              )}

              {linkedProducts.length ? (
                <BlogShopProducts
                  products={linkedProducts}
                  isAuthenticated={isAuthenticated}
                />
              ) : null}

              <BlogArticleCta
                title={settings?.ctaTitle ?? null}
                description={settings?.ctaDescription ?? null}
                buttonLabel={settings?.ctaButtonLabel ?? null}
                buttonHref={settings?.ctaButtonHref ?? null}
              />

              <BlogPostAdjacentNav
                previous={adjacent.previous}
                next={adjacent.next}
              />

              {related.length ? (
                <div className="mt-10 border-t border-[var(--color-border)] pt-6 md:hidden">
                  <BlogCategorySidebar
                    categories={[]}
                    relatedPosts={related}
                    relatedTitle={relatedTitle}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </Container>
      </article>
    </main>
  );
}
