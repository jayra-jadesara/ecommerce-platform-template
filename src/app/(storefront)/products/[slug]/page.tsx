import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { recordProductView } from "@/features/catalog/record-product-view";
import { ProductDetailClient } from "@/features/catalog/components/ProductDetailClient";
import { PopularProducts } from "@/features/catalog/components/PopularProducts";
import { RecentlyViewedProducts } from "@/features/catalog/components/RecentlyViewedProducts";
import { RelatedProducts } from "@/features/catalog/components/RelatedProducts";
import {
  getStorefrontProductBySlug,
  listPopularStorefrontProducts,
  listSimilarStorefrontProducts,
} from "@/features/catalog/storefront";
import { getCurrentUser } from "@/features/auth/session";
import { getPlatformConfigAsync } from "@/config/site.server";
import { metadataFromResolved } from "@/lib/metadata";
import { resolveProductSeo } from "@/features/seo/resolve";
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  JsonLdScript,
} from "@/features/seo";
import { Container, StorefrontBreadcrumb } from "@/components/layout";
import { absoluteUrl } from "@/lib/site-url";
import { ProductReviewsSection } from "@/features/reviews/components/ProductReviewsSection";
import {
  getMyProductReview,
  getProductReviewSummary,
  getReviewsStoreSettings,
  listApprovedProductReviews,
} from "@/features/reviews/service";
import { ReelsShowcase } from "@/features/reels/components/ReelsShowcase";
import {
  getReelsShowcaseSettings,
  listStorefrontReelsForProduct,
} from "@/features/reels/reels-service";
import { ProductRelatedBlogPosts } from "@/features/blog/components/ProductRelatedBlogPosts";
import {
  getBlogSettingsCached,
  listPublishedBlogPostsForProduct,
} from "@/features/blog/storefront";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getProductPageSettings } from "@/features/catalog/product-page-settings-service";
import { FaqAccordion } from "@/features/cms/components/FaqAccordion";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [product, config] = await Promise.all([
    getStorefrontProductBySlug(slug),
    getPlatformConfigAsync(),
  ]);
  if (!product) {
    return metadataFromResolved(
      {
        title: "Product not found",
        description: config.seo.description,
        canonicalPath: `/products/${slug}`,
        canonicalUrl: "",
        ogType: "website",
        robotsIndex: false,
        robotsFollow: false,
      },
      config.seo,
    );
  }

  const primary =
    product.images.find((image) => image.isPrimary) ?? product.images[0];
  const resolved = resolveProductSeo({
    product: {
      name: product.name,
      slug: product.slug,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      shortDescription: product.shortDescription,
      primaryImageUrl: primary?.url,
    },
    seo: config.seo,
    brandName: config.brand.name,
  });
  return metadataFromResolved(resolved, {
    ...config.seo,
    titleTemplate: config.seo.titleTemplate,
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, config, user, pageSettings] = await Promise.all([
    getStorefrontProductBySlug(slug),
    getPlatformConfigAsync(),
    getCurrentUser(),
    getProductPageSettings(),
  ]);
  if (!product) notFound();

  // Non-blocking view counter for Dashboard analytics
  void recordProductView(product.id);

  const isAuthenticated = Boolean(user);
  const reviewsSettings = await getReviewsStoreSettings();
  const reviewsEnabled = reviewsSettings.enabled;
  const previewLimit = reviewsSettings.previewLimit;
  const [
    related,
    popularRaw,
    reviewSummary,
    approvedReviews,
    myReview,
    productReelsPayload,
    relatedBlogPosts,
    blogSettings,
  ] =
    await Promise.all([
      listSimilarStorefrontProducts({
        productId: product.id,
        categoryId: product.category?.id ?? null,
        limit: 5,
      }),
      listPopularStorefrontProducts({
        excludeProductId: product.id,
        limit: 8,
      }),
      reviewsEnabled
        ? getProductReviewSummary(product.id)
        : Promise.resolve({
            productId: product.id,
            average: 0,
            count: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          }),
      reviewsEnabled
        ? listApprovedProductReviews(product.id, "newest", previewLimit)
        : Promise.resolve([]),
      reviewsEnabled && isAuthenticated
        ? getMyProductReview(product.id)
        : Promise.resolve(null),
      resolveActiveStoreId().then(async (storeId) => {
        const [reels, showcase] = await Promise.all([
          listStorefrontReelsForProduct(product.id, storeId, 8),
          getReelsShowcaseSettings(storeId),
        ]);
        return { reels, showcase };
      }),
      pageSettings.blogEnabled
        ? listPublishedBlogPostsForProduct(product.id, 4)
        : Promise.resolve([]),
      pageSettings.blogEnabled
        ? getBlogSettingsCached()
        : Promise.resolve(null),
    ]);
  const relatedIds = new Set(related.map((p) => p.id));
  const popular = popularRaw
    .filter((p) => !relatedIds.has(p.id))
    .slice(0, 5);
  const productReels = productReelsPayload?.reels ?? [];
  const reelsAutoplayMuted =
    productReelsPayload?.showcase.autoplayMuted ?? true;
  const productReelsHeading =
    productReelsPayload?.showcase.productPageHeading ?? "Seen in reels";
  const productReelsVisibleSlides =
    productReelsPayload?.showcase.visibleSlides ?? 3;

  const activeFaqQuestions = pageSettings.faqQuestions.filter((q) => q.active);
  const faqItems = product.faqEnabled
    ? activeFaqQuestions
        .map((q) => ({
          question: q.question,
          answer: (product.faqAnswers[q.id] ?? "").trim(),
        }))
        .filter((item) => item.answer.length > 0)
    : [];
  const showProductFaq = faqItems.length > 0;
  const detailSections = pageSettings.sections.filter((s) => s.active);

  const ratingCount = reviewsEnabled
    ? Math.max(product.ratingCount, reviewSummary.count)
    : 0;
  const ratingAvg =
    ratingCount > 0
      ? product.ratingCount > 0
        ? product.ratingAvg
        : reviewSummary.average
      : 0;

  const productLd = buildProductJsonLd({
    name: product.name,
    description:
      product.seoDescription || product.shortDescription || product.description,
    slug: product.slug,
    brand: product.brand,
    images: product.images.map((image) => ({
      url: image.url,
      altText: image.altText,
    })),
    currency: config.store.currency,
    variants: product.variants.map((variant) => ({
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      stockStatus: variant.stockStatus,
    })),
    category: product.category,
    aggregateRating:
      ratingCount > 0
        ? { ratingValue: ratingAvg, reviewCount: ratingCount }
        : null,
  });

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Products", path: "/products" },
    ...(product.category
      ? [
          {
            name: product.category.name,
            path: `/categories/${product.category.slug}`,
          },
        ]
      : []),
    { name: product.name, path: `/products/${product.slug}` },
  ];

  return (
    <Container
      flush
      constrained={false}
      className="relative z-0 mx-auto w-full max-w-[var(--layout-content-max,1520px)] px-[max(var(--layout-container-padding),var(--sf-dev-edge-clearance,0px))] py-8 md:py-10"
    >
      <JsonLdScript data={[productLd, buildBreadcrumbJsonLd(crumbs)]} />
      <StorefrontBreadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products" },
          ...(product.category
            ? [
                {
                  label: product.category.name,
                  href: `/categories/${product.category.slug}`,
                },
              ]
            : []),
          { label: product.name },
        ]}
      />
      <ProductDetailClient
        product={product}
        currency={config.store.currency}
        isAuthenticated={isAuthenticated}
        visualEffects={config.visualEffects}
        animation={config.animation}
        shareUrl={absoluteUrl(`/products/${product.slug}`)}
        social={config.social}
        reviewsEnabled={reviewsEnabled}
        detailSections={detailSections}
      />
      {showProductFaq ? (
        <section className="mt-10 md:mt-12">
          <div className="mx-auto w-full max-w-5xl">
            <div className="text-center">
              <StorefrontHeading
                title={pageSettings.faqHeading}
                as="h2"
                align="center"
                className="!text-2xl"
              />
            </div>
            <div className="mt-6 md:mt-8">
              <FaqAccordion items={faqItems} />
            </div>
          </div>
        </section>
      ) : null}
      <RelatedProducts
        products={related}
        currency={config.store.currency}
        isAuthenticated={isAuthenticated}
      />
      <PopularProducts
        products={popular}
        currency={config.store.currency}
        isAuthenticated={isAuthenticated}
      />
      <RecentlyViewedProducts
        currentSlug={product.slug}
        currency={config.store.currency}
        isAuthenticated={isAuthenticated}
      />
      {pageSettings.blogEnabled ? (
        <ProductRelatedBlogPosts
          posts={relatedBlogPosts}
          settings={blogSettings}
          heading={pageSettings.blogHeading}
        />
      ) : null}
      {productReels.length > 0 ? (
        <div className="mt-10 md:mt-12">
          <ReelsShowcase
            reels={productReels}
            currency={config.store.currency}
            storeName={config.brand.name}
            heading={productReelsHeading}
            visibleSlides={productReelsVisibleSlides}
            autoplayMuted={reelsAutoplayMuted}
            headingHighlightStyle={config.typography.headingHighlightStyle}
          />
        </div>
      ) : null}
      {reviewsEnabled ? (
        <ProductReviewsSection
          productId={product.id}
          productSlug={product.slug}
          productName={product.name}
          productImageUrl={
            (
              product.images.find((image) => image.isPrimary) ??
              product.images[0]
            )?.url ?? null
          }
          isAuthenticated={isAuthenticated}
          summary={reviewSummary}
          reviews={approvedReviews}
          myReview={myReview}
          previewLimit={previewLimit}
        />
      ) : null}
    </Container>
  );
}
