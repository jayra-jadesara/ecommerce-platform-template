import type { Metadata } from "next";
import { PageShell, StorefrontBreadcrumb } from "@/components/layout";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { ProductsCatalog } from "@/features/catalog/components/ProductsCatalog";
import {
  countStorefrontProductsByCategory,
  listStorefrontCategories,
  listStorefrontProducts,
} from "@/features/catalog/storefront";
import { getCurrentUser } from "@/features/auth/session";
import { getPlatformConfigAsync } from "@/config/site.server";
import { metadataFromResolved } from "@/lib/metadata";
import { resolveProductsListingSeo } from "@/features/seo/resolve";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const pageRaw = typeof params.page === "string" ? params.page : "1";
  const page = Number(pageRaw) || 1;
  const config = await getPlatformConfigAsync();
  return metadataFromResolved(
    resolveProductsListingSeo({ seo: config.seo, page }),
    config.seo,
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && value[0]) flat[key] = value[0];
  }

  const config = await getPlatformConfigAsync();
  const [list, categories, user, counts] = await Promise.all([
    listStorefrontProducts(flat),
    listStorefrontCategories(),
    getCurrentUser(),
    countStorefrontProductsByCategory(),
  ]);
  const isAuthenticated = Boolean(user);

  const q = flat.q ?? "";
  const categoryId = flat.categoryId ?? "";
  const sort = flat.sort ?? "newest";
  const page = Number(flat.page || "1") || 1;
  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <PageShell showBack={false} className="!pt-3 md:!pt-5">
      <StorefrontBreadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Products" },
        ]}
      />
      <header className="mx-auto mb-3 max-w-5xl md:mb-4">
        <StorefrontHeading
          title="Products"
          as="h1"
          align="center"
          className="!text-xl md:!text-2xl"
        />
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
        categoryId={categoryId}
        sort={sort}
        page={page}
        totalPages={totalPages}
      />
    </PageShell>
  );
}
