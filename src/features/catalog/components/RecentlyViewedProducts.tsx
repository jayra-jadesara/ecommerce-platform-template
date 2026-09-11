"use client";

import { useEffect, useState } from "react";
import { getProductsBySlugsAction } from "@/features/catalog/products-by-slugs-action";
import {
  getRecentlyViewedSlugs,
  recordRecentlyViewedSlug,
} from "@/features/catalog/recently-viewed";
import type { StorefrontProductCard } from "@/features/catalog/storefront";
import { ProductRail } from "@/features/catalog/components/ProductRail";

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
  const [products, setProducts] = useState<StorefrontProductCard[]>([]);

  useEffect(() => {
    recordRecentlyViewedSlug(currentSlug);
    const slugs = getRecentlyViewedSlugs(currentSlug).slice(0, 5);
    if (!slugs.length) {
      setProducts([]);
      return;
    }

    let cancelled = false;
    void getProductsBySlugsAction(slugs).then((items) => {
      if (!cancelled) setProducts(items.slice(0, 5));
    });

    return () => {
      cancelled = true;
    };
  }, [currentSlug]);

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
