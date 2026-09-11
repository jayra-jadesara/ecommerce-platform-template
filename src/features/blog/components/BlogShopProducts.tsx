"use client";

import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  isInWishlistAction,
  toggleWishlistAction,
} from "@/features/wishlist/actions";
import { wishlistQueryKey } from "@/features/wishlist/query-keys";

export type BlogShopProduct = {
  id: string;
  name: string;
  slug: string;
};

function ProductWishlistButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const queryClient = useQueryClient();
  /** Avoid SSR/client mismatch while wishlist query resolves. */
  const [wishlistReady, setWishlistReady] = useState(false);

  useEffect(() => {
    setWishlistReady(true);
  }, []);

  const wishlistQuery = useQuery({
    queryKey: [...wishlistQueryKey, "contains", productId],
    queryFn: () => isInWishlistAction({ productId }),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: () => toggleWishlistAction({ productId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
      await wishlistQuery.refetch();
    },
  });

  const inWishlist = wishlistReady && Boolean(wishlistQuery.data);

  return (
    <button
      type="button"
      disabled={mutation.isPending}
      aria-label={
        inWishlist
          ? `Remove ${productName} from wishlist`
          : `Save ${productName} to wishlist`
      }
      title={inWishlist ? "Saved" : "Save to wishlist"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        mutation.mutate();
      }}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
    >
      {inWishlist ? (
        <FavoriteIcon fontSize="small" className="!text-[var(--color-primary)]" />
      ) : (
        <FavoriteBorderIcon fontSize="small" />
      )}
    </button>
  );
}

export function BlogShopProducts({
  products,
}: {
  products: BlogShopProduct[];
}) {
  if (!products.length) return null;

  return (
    <section className="mt-12" aria-labelledby="blog-shop-article">
      <h2
        id="blog-shop-article"
        className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--color-foreground)]"
      >
        Shop this article
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Products mentioned in this story
      </p>
      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {products.map((product) => (
          <li key={product.id}>
            <div className="flex items-center gap-2 rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_55%,transparent)] p-2 pl-3">
              <Link
                href={`/products/${product.slug}`}
                className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                  <ShoppingBagOutlinedIcon fontSize="small" />
                </span>
                <span className="min-w-0 truncate">{product.name}</span>
              </Link>
              <ProductWishlistButton
                productId={product.id}
                productName={product.name}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
