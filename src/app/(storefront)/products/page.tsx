import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CollectionFilterDrawer } from "@/features/catalog/components/CollectionFilterDrawer";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import {
  listStorefrontCategories,
  listStorefrontProducts,
} from "@/features/catalog/storefront";
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
  const [list, categories] = await Promise.all([
    listStorefrontProducts(flat),
    listStorefrontCategories(),
  ]);

  const q = flat.q ?? "";
  const categoryId = flat.categoryId ?? "";
  const sort = flat.sort ?? "featured";
  const page = Number(flat.page || "1") || 1;
  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  function href(next: Record<string, string | undefined>) {
    const merged = { q, categoryId, sort, page: String(page), ...next };
    const search = new URLSearchParams();
    if (merged.q) search.set("q", merged.q);
    if (merged.categoryId) search.set("categoryId", merged.categoryId);
    if (merged.sort && merged.sort !== "featured") search.set("sort", merged.sort);
    if (merged.page && merged.page !== "1") search.set("page", merged.page);
    const qs = search.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  }

  return (
    <PageShell title="Products" backHref="/" backLabel="Back to home">
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        {list.total === 0
          ? "No products match your filters."
          : `${list.total} ${list.total === 1 ? "product" : "products"}`}
      </p>
      <div className="mb-4 md:hidden">
        <CollectionFilterDrawer
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          q={q}
          categoryId={categoryId}
          sort={sort}
        />
      </div>
      <form
        className="mb-6 hidden flex-col gap-3 rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 md:flex md:flex-row md:flex-wrap md:items-center md:p-4"
        method="get"
      >
        <label className="sr-only" htmlFor="product-search">
          Search products
        </label>
        <input
          id="product-search"
          name="q"
          defaultValue={q}
          placeholder="Search products"
          className="w-full min-h-11 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        />
        <label className="sr-only" htmlFor="product-category">
          Category
        </label>
        <select
          id="product-category"
          name="categoryId"
          defaultValue={categoryId}
          className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] sm:min-w-[11rem]"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="product-sort">
          Sort
        </label>
        <select
          id="product-sort"
          name="sort"
          defaultValue={sort}
          className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] sm:min-w-[10rem]"
        >
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="name">Name</option>
        </select>
        <button
          type="submit"
          className="min-h-11 rounded-md bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-[var(--color-button-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          Apply
        </button>
      </form>

      {list.items.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try a different search, or browse the full catalog once products are published."
          action={
            q || categoryId ? (
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-default,0.5rem)] bg-[var(--color-button-background)] px-5 py-2.5 text-sm font-semibold text-[var(--color-button-foreground)]"
              >
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {list.items.map((product) => (
            <li key={product.id} className="min-w-0">
              <ProductCard product={product} currency={config.store.currency} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav
          className="mt-8 flex items-center justify-between text-sm"
          aria-label="Pagination"
        >
          <Link
            href={href({ page: String(Math.max(1, page - 1)) })}
            aria-disabled={page <= 1}
            className={page <= 1 ? "pointer-events-none opacity-40" : "underline"}
          >
            Previous
          </Link>
          <span className="text-[var(--color-muted)]">
            Page {page} of {totalPages}
          </span>
          <Link
            href={href({ page: String(Math.min(totalPages, page + 1)) })}
            aria-disabled={page >= totalPages}
            className={
              page >= totalPages ? "pointer-events-none opacity-40" : "underline"
            }
          >
            Next
          </Link>
        </nav>
      ) : null}
    </PageShell>
  );
}
