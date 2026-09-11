"use client";

import { ProductCard } from "@/features/catalog/components/ProductCard";
import type { StorefrontProductCard } from "@/features/catalog/storefront";

type ProductRailProps = {
  title: string;
  headingId: string;
  products: StorefrontProductCard[];
  currency: string;
  isAuthenticated?: boolean;
  /** Extra top spacing (e.g. recently viewed under related). */
  spacious?: boolean;
};

/** Compact PDP recommendation strip — max ~5 cards in one row on desktop. */
export function ProductRail({
  title,
  headingId,
  products,
  currency,
  isAuthenticated = false,
  spacious = false,
}: ProductRailProps) {
  if (!products.length) return null;

  const shown = products.slice(0, 5);

  return (
    <section
      className={spacious ? "mt-16 md:mt-20" : "mt-12 md:mt-14"}
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="text-lg font-semibold text-[var(--color-foreground)] md:text-xl"
      >
        {title}
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
        {shown.map((product) => (
          <li key={product.id} className="min-w-0">
            <ProductCard
              product={product}
              currency={currency}
              isAuthenticated={isAuthenticated}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
