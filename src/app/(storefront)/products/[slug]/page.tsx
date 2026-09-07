import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/features/catalog/components/ProductDetailClient";
import { getStorefrontProductBySlug } from "@/features/catalog/storefront";
import { getPlatformConfigAsync } from "@/config/site";
import { buildPageMetadata } from "@/lib/metadata";
import { Container } from "@/components/layout";

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
    return buildPageMetadata({
      title: "Product not found",
      seo: config.seo,
    });
  }

  return buildPageMetadata({
    title: product.seoTitle || product.name,
    description:
      product.seoDescription ||
      product.shortDescription ||
      config.seo.description,
    seo: {
      ...config.seo,
      title: product.seoTitle || product.name,
      description:
        product.seoDescription ||
        product.shortDescription ||
        config.seo.description,
    },
    canonicalPath: `/products/${product.slug}`,
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, config] = await Promise.all([
    getStorefrontProductBySlug(slug),
    getPlatformConfigAsync(),
  ]);
  if (!product) notFound();

  return (
    <Container className="py-10">
      <ProductDetailClient product={product} currency={config.store.currency} />
    </Container>
  );
}
