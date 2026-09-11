"use client";

import type { StorefrontProductCard } from "@/features/catalog/storefront";
import { ProductRail } from "@/features/catalog/components/ProductRail";

type PopularProductsProps = {
  products: StorefrontProductCard[];
  currency: string;
  isAuthenticated?: boolean;
};

export function PopularProducts({
  products,
  currency,
  isAuthenticated = false,
}: PopularProductsProps) {
  return (
    <ProductRail
      title="Most viewed products"
      headingId="most-viewed-heading"
      products={products}
      currency={currency}
      isAuthenticated={isAuthenticated}
      spacious
    />
  );
}
