"use server";

import { listStorefrontProducts } from "@/features/catalog/storefront";

export type HeaderSearchHit = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  categoryName: string | null;
  price: number | null;
};

/** Lightweight product search for the header autocomplete panel. */
export async function searchHeaderProductsAction(
  query: string,
): Promise<HeaderSearchHit[]> {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];

  const result = await listStorefrontProducts({
    q,
    page: 1,
    pageSize: 6,
    sort: "newest",
  });

  return result.items.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    imageUrl: item.primaryImageUrl ?? null,
    categoryName: item.categoryName,
    price: item.minPrice,
  }));
}
