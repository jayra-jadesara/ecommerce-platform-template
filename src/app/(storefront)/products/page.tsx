import Link from "next/link";
import { PageShell } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  formatMoney,
  listStorefrontCategories,
  listStorefrontProducts,
} from "@/features/catalog/storefront";
import { getPlatformConfigAsync } from "@/config/site";

export const dynamic = "force-dynamic";

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
  const page = Number(flat.page || "1") || 1;
  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  function href(next: Record<string, string | undefined>) {
    const merged = { q, categoryId, page: String(page), ...next };
    const search = new URLSearchParams();
    if (merged.q) search.set("q", merged.q);
    if (merged.categoryId) search.set("categoryId", merged.categoryId);
    if (merged.page && merged.page !== "1") search.set("page", merged.page);
    const qs = search.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  }

  return (
    <PageShell
      title="Products"
      description="Browse active products from the store catalog."
    >
      <form className="mb-6 flex flex-col gap-3 sm:flex-row" method="get">
        <label className="sr-only" htmlFor="product-search">
          Search products
        </label>
        <input
          id="product-search"
          name="q"
          defaultValue={q}
          placeholder="Search products"
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        />
        <label className="sr-only" htmlFor="product-category">
          Category
        </label>
        <select
          id="product-category"
          name="categoryId"
          defaultValue={categoryId}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-button-background)] px-4 py-2 text-sm font-medium text-[var(--color-button-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          Filter
        </button>
      </form>

      {list.items.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Active products will appear here once the catalog is configured in Admin."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.items.map((product) => (
            <li key={product.id}>
              <Link
                href={`/products/${product.slug}`}
                className="block h-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition-colors hover:border-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              >
                  <div
                  className="relative mb-3 flex h-36 items-center justify-center overflow-hidden rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-muted)]"
                >
                  {product.primaryImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.primaryImageUrl}
                      alt={product.primaryImageAlt || product.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span>No image</span>
                  )}
                </div>
                <p className="font-medium text-[var(--color-foreground)]">
                  {product.name}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {product.categoryName ?? "Uncategorized"}
                  {product.featured ? " · Featured" : ""}
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {product.minPrice == null
                    ? "Price unavailable"
                    : product.minPrice === product.maxPrice
                      ? formatMoney(product.minPrice, config.store.currency)
                      : `${formatMoney(product.minPrice, config.store.currency)} – ${formatMoney(product.maxPrice!, config.store.currency)}`}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {product.stockStatus.replaceAll("_", " ")}
                </p>
              </Link>
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
