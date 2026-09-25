"use client";

import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Link from "next/link";
import { ProductWishlistButton } from "@/features/catalog/components/ProductWishlistButton";

export type BlogShopProduct = {
  id: string;
  name: string;
  slug: string;
  /** First active variant — required for wishlist (same as product cards). */
  defaultVariantId: string | null;
};

export function BlogShopProducts({
  products,
  isAuthenticated,
}: {
  products: BlogShopProduct[];
  isAuthenticated: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <ul className="mt-4 space-y-2">
      {products.map((product) => (
        <li key={product.id}>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2">
            <Link
              href={`/products/${product.slug}`}
              className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
            >
              <ShoppingBagOutlinedIcon fontSize="small" aria-hidden />
              <span className="truncate">{product.name}</span>
            </Link>
            {product.defaultVariantId ? (
              <ProductWishlistButton
                productId={product.id}
                productSlug={product.slug}
                variantId={product.defaultVariantId}
                isAuthenticated={isAuthenticated}
                className="!h-9 !w-9 shrink-0 border border-[var(--color-border)] shadow-none"
              />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
