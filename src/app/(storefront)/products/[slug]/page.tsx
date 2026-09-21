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
  const [product, config, user] = await Promise.all([
    getStorefrontProductBySlug(slug),
    getPlatformConfigAsync(),
    getCurrentUser(),
  ]);
  if (!product) notFound();

  // Non-blocking view counter for Dashboard analytics
  void recordProductView(product.id);

  const isAuthenticated = Boolean(user);
  const reviewsSettings = await getReviewsStoreSettings();
  const reviewsEnabled = reviewsSettings.enabled;
  const previewLimit = reviewsSettings.previewLimit;
  const [related, popularRaw, reviewSummary, approvedReviews, myReview] =
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
    ]);
  const relatedIds = new Set(related.map((p) => p.id));
  const popular = popularRaw
    .filter((p) => !relatedIds.has(p.id))
    .slice(0, 5);

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
      className="relative z-0 mx-auto w-full max-w-[var(--layout-content-max,1520px)] py-8 pl-4 pr-[max(1rem,var(--sf-dev-edge-clearance,0px))] sm:pl-5 sm:pr-[max(1.25rem,var(--sf-dev-edge-clearance,0px))] md:py-10 md:pl-6 md:pr-[max(1.5rem,var(--sf-dev-edge-clearance,0px))]"
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
      />
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
