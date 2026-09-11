"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProductsBySlugsAction } from "@/features/catalog/products-by-slugs-action";
import {
  getRecentlyViewedSlugs,
  recordRecentlyViewedSlug,
} from "@/features/catalog/recently-viewed";
import { ProductRail } from "@/features/catalog/components/ProductRail";
import { useHasHydrated } from "@/lib/use-has-hydrated";

type RecentlyViewedProductsProps = {
  currentSlug: string;
  currency: string;
  isAuthenticated?: boolean;
};

export function RecentlyViewedProducts({
  currentSlug,
  currency,
  isAuthenticated = false,
}: RecentlyViewedProductsProps) {
  const hydrated = useHasHydrated();

  useEffect(() => {
    recordRecentlyViewedSlug(currentSlug);
  }, [currentSlug]);

  const slugs = hydrated
    ? getRecentlyViewedSlugs(currentSlug).slice(0, 5)
    : [];

  const { data: products = [] } = useQuery({
    queryKey: ["recently-viewed", currentSlug, slugs.join("|")],
    queryFn: async () => {
      const items = await getProductsBySlugsAction(slugs);
      return items.slice(0, 5);
    },
    enabled: hydrated && slugs.length > 0,
    staleTime: 30_000,
  });

  if (!products.length) return null;

  return (
    <ProductRail
      title="Recently viewed products"
      headingId="recently-viewed-heading"
      products={products}
      currency={currency}
      isAuthenticated={isAuthenticated}
      spacious
    />
  );
}
