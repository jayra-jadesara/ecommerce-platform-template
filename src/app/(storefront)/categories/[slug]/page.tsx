import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import {
  getStorefrontCategoryBySlug,
  listStorefrontProducts,
} from "@/features/catalog/storefront";
import { getPlatformConfigAsync } from "@/config/site";
import { metadataFromResolved } from "@/lib/metadata";
import { resolveCategorySeo } from "@/features/seo/resolve";
import {
  buildBreadcrumbJsonLd,
  JsonLdScript,
} from "@/features/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [category, config] = await Promise.all([
    getStorefrontCategoryBySlug(slug),
    getPlatformConfigAsync(),
  ]);
  if (!category) {
    return metadataFromResolved(
      {
        title: "Category not found",
        description: config.seo.description,
        canonicalPath: `/categories/${slug}`,
        canonicalUrl: "",
        ogType: "website",
        robotsIndex: false,
        robotsFollow: false,
      },
      config.seo,
    );
  }

  const resolved = resolveCategorySeo({
    category: {
      name: category.name,
      slug: category.slug,
      description: category.description,
      seoTitle: category.seoTitle,
      seoDescription: category.seoDescription,
      imageUrl: category.imageUrl,
    },
    seo: config.seo,
  });
  return metadataFromResolved(resolved, config.seo);
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [category, config] = await Promise.all([
    getStorefrontCategoryBySlug(slug),
    getPlatformConfigAsync(),
  ]);
  if (!category) notFound();

  const list = await listStorefrontProducts({
    categoryId: category.id,
    page: "1",
    pageSize: "24",
  });

  const breadcrumbs = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: category.name, path: `/categories/${category.slug}` },
  ]);

  return (
    <PageShell
      title={category.name}
      description={category.description ?? undefined}
    >
      <JsonLdScript data={breadcrumbs} />
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        <Link href="/" className="underline-offset-2 hover:underline">
          Home
        </Link>
        {" / "}
        <Link href="/products" className="underline-offset-2 hover:underline">
          Products
        </Link>
        {" / "}
        <span>{category.name}</span>
      </p>
      {list.items.length === 0 ? (
        <EmptyState
          title="No products in this category"
          description="Check back later or browse all products."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.items.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} currency={config.store.currency} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
