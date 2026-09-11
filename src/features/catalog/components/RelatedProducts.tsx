"use client";

import type { StorefrontProductCard } from "@/features/catalog/storefront";
import { ProductRail } from "@/features/catalog/components/ProductRail";

type RelatedProductsProps = {
  products: StorefrontProductCard[];
  currency: string;
  isAuthenticated?: boolean;
  title?: string;
};

export function RelatedProducts({
  products,
  currency,
  isAuthenticated = false,
  title = "Related products",
}: RelatedProductsProps) {
  return (
    <ProductRail
      title={title}
      headingId="related-products-heading"
      products={products}
      currency={currency}
      isAuthenticated={isAuthenticated}
    />
  );
}
