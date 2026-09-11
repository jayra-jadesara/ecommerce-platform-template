import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
import { BackLink, Container } from "@/components/layout";

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

  const isAuthenticated = Boolean(user);
  const [related, popularRaw] = await Promise.all([
    listSimilarStorefrontProducts({
      productId: product.id,
      categoryId: product.category?.id ?? null,
      limit: 5,
    }),
    listPopularStorefrontProducts({
      excludeProductId: product.id,
      limit: 8,
    }),
  ]);
  const relatedIds = new Set(related.map((p) => p.id));
  const popular = popularRaw
    .filter((p) => !relatedIds.has(p.id))
    .slice(0, 5);

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
  });

  const crumbs = [
    { name: "Home", path: "/" },
    ...(product.category
      ? [
          {
            name: product.category.name,
            path: `/categories/${product.category.slug}`,
          },
        ]
      : [{ name: "Products", path: "/products" }]),
    { name: product.name, path: `/products/${product.slug}` },
  ];

  return (
    <Container className="relative z-0 py-8 md:py-12">
      <div className="mb-5">
        <BackLink href="/products" label="Back to products" />
      </div>
      <JsonLdScript data={[productLd, buildBreadcrumbJsonLd(crumbs)]} />
      <ProductDetailClient
        product={product}
        currency={config.store.currency}
        isAuthenticated={isAuthenticated}
        visualEffects={config.visualEffects}
        animation={config.animation}
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
    </Container>
  );
}
