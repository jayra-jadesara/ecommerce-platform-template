import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout";
import { ProductsCatalog } from "@/features/catalog/components/ProductsCatalog";
import {
  countStorefrontProductsByCategory,
  getStorefrontCategoryBySlug,
  listStorefrontCategories,
  listStorefrontProducts,
} from "@/features/catalog/storefront";
import { getCurrentUser } from "@/features/auth/session";
import { getPlatformConfigAsync } from "@/config/site.server";
import { metadataFromResolved } from "@/lib/metadata";
import { resolveCategorySeo } from "@/features/seo/resolve";
import {
  buildBreadcrumbJsonLd,
  JsonLdScript,
} from "@/features/seo";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const rawParams = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && value[0]) flat[key] = value[0];
  }

  const [category, config, user, categories, counts] = await Promise.all([
    getStorefrontCategoryBySlug(slug),
    getPlatformConfigAsync(),
    getCurrentUser(),
    listStorefrontCategories(),
    countStorefrontProductsByCategory(),
  ]);
  if (!category) notFound();

  const sort = flat.sort ?? "newest";
  const q = flat.q ?? "";
  const page = Number(flat.page || "1") || 1;

  const list = await listStorefrontProducts({
    ...flat,
    categoryId: category.id,
    page: String(page),
    sort,
  });
  const isAuthenticated = Boolean(user);
  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  const breadcrumbs = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: category.name, path: `/categories/${category.slug}` },
  ]);

  return (
    <PageShell showBack={false} className="!pt-3 md:!pt-5">
      <JsonLdScript data={breadcrumbs} />
      <header className="mx-auto mb-3 max-w-5xl md:mb-4">
        <h1 className="text-center font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--color-foreground)] md:text-2xl">
          {category.name}
        </h1>
        {category.description ? (
          <p className="mx-auto mt-1 max-w-2xl text-center text-xs text-[var(--color-muted)]">
            {category.description}
          </p>
        ) : null}
        <nav
          className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-muted)]"
          aria-label="Breadcrumb"
        >
          <Link
            href="/"
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            Home
          </Link>
          <span aria-hidden className="text-[var(--color-border)]">
            /
          </span>
          <span className="text-[var(--color-foreground)]">{category.name}</span>
        </nav>
      </header>

      <ProductsCatalog
        products={list.items}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          count: counts[c.id] ?? 0,
        }))}
        currency={config.store.currency}
        isAuthenticated={isAuthenticated}
        total={list.total}
        q={q}
        categoryId={category.id}
        sort={sort}
        page={page}
        totalPages={totalPages}
        basePath={`/categories/${category.slug}`}
        lockCategory
      />
    </PageShell>
  );
}
