import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Container, StorefrontBreadcrumb } from "@/components/layout";
import { getCurrentUser } from "@/features/auth/session";
import { getStorefrontProductBySlug } from "@/features/catalog/storefront";
import { getPlatformConfigAsync } from "@/config/site.server";
import { ProductReviewsPageClient } from "@/features/reviews/components/ProductReviewsPageClient";
import {
  getMyProductReview,
  getProductReviewSummary,
  getReviewsEnabled,
  listApprovedProductReviews,
} from "@/features/reviews/service";
import { metadataFromResolved } from "@/lib/metadata";

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
        title: "Reviews not found",
        description: config.seo.description,
        canonicalPath: `/products/${slug}/reviews`,
        canonicalUrl: "",
        ogType: "website",
        robotsIndex: false,
        robotsFollow: false,
      },
      config.seo,
    );
  }

  return metadataFromResolved(
    {
      title: `Reviews · ${product.name}`,
      description:
        product.shortDescription ||
        `Customer reviews for ${product.name}`,
      canonicalPath: `/products/${product.slug}/reviews`,
      canonicalUrl: "",
      ogType: "website",
      robotsIndex: true,
      robotsFollow: true,
    },
    config.seo,
  );
}

export default async function ProductReviewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const reviewsEnabled = await getReviewsEnabled();
  if (!reviewsEnabled) {
    redirect(`/products/${slug}`);
  }

  const [product, user] = await Promise.all([
    getStorefrontProductBySlug(slug),
    getCurrentUser(),
  ]);
  if (!product) notFound();

  const isAuthenticated = Boolean(user);
  const [summary, reviews, myReview] = await Promise.all([
    getProductReviewSummary(product.id),
    listApprovedProductReviews(product.id, "newest", 100),
    isAuthenticated ? getMyProductReview(product.id) : Promise.resolve(null),
  ]);

  return (
    <Container
      flush
      constrained={false}
      className="relative z-0 mx-auto w-full max-w-[var(--layout-content-max,1520px)] py-8 pl-4 pr-[max(1rem,var(--sf-dev-edge-clearance,0px))] sm:pl-5 sm:pr-[max(1.25rem,var(--sf-dev-edge-clearance,0px))] md:py-10 md:pl-6 md:pr-[max(1.5rem,var(--sf-dev-edge-clearance,0px))]"
    >
      <StorefrontBreadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products" },
          {
            label: product.name,
            href: `/products/${product.slug}`,
          },
          { label: "Reviews" },
        ]}
      />
      <ProductReviewsPageClient
        productId={product.id}
        productSlug={product.slug}
        productName={product.name}
        productImageUrl={
          (
            product.images.find((image) => image.isPrimary) ?? product.images[0]
          )?.url ?? null
        }
        isAuthenticated={isAuthenticated}
        summary={summary}
        reviews={reviews}
        myReview={myReview}
      />
    </Container>
  );
}
