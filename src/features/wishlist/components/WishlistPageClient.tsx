"use client";

import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addToCartAction } from "@/features/cart/actions";
import { cartQueryKey } from "@/features/cart/query-keys";
import { formatMoney } from "@/features/catalog/money";
import {
  getWishlistAction,
  removeFromWishlistAction,
} from "@/features/wishlist/actions";
import { wishlistQueryKey } from "@/features/wishlist/query-keys";
import type { WishlistView } from "@/features/wishlist/types";

interface WishlistPageClientProps {
  initialWishlist: WishlistView;
}

export function WishlistPageClient({
  initialWishlist,
}: WishlistPageClientProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data: wishlist = initialWishlist } = useQuery({
    queryKey: wishlistQueryKey,
    queryFn: () => getWishlistAction(),
    initialData: initialWishlist,
    staleTime: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWishlistAction,
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setMessage(result.message ?? "Removed.");
      queryClient.setQueryData(wishlistQueryKey, result.wishlist);
    },
  });

  const addMutation = useMutation({
    mutationFn: addToCartAction,
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setMessage("Added to cart.");
      queryClient.setQueryData(cartQueryKey, result.cart);
      void queryClient.invalidateQueries({ queryKey: cartQueryKey });
    },
  });

  if (wishlist.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-12 text-center">
        <h2 className="text-xl font-semibold">Your wishlist is empty</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Save products while browsing to find them here later.
        </p>
        <Link
          href="/products"
          className="mt-4 inline-flex text-sm font-medium underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-green-700" role="status">
          {message}
        </p>
      ) : null}

      <ul className="space-y-4" aria-label="Wishlist items">
        {wishlist.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-4 sm:flex-row"
          >
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.imageAlt}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-xs text-[var(--color-muted)]">
                  No image
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              {item.productSlug ? (
                <Link
                  href={`/products/${item.productSlug}`}
                  className="font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                >
                  {item.productName}
                </Link>
              ) : (
                <p className="font-medium">{item.productName}</p>
              )}
              {item.variantName ? (
                <p className="text-sm text-[var(--color-muted)]">
                  {item.variantName}
                </p>
              ) : null}
              <p className="text-sm font-semibold">
                {item.unitPrice != null
                  ? formatMoney(item.unitPrice, wishlist.currency)
                  : "Price unavailable"}
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                {item.stockStatus === "UNAVAILABLE"
                  ? "Unavailable"
                  : item.stockStatus.replaceAll("_", " ")}
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!item.canAddToCart || !item.variantId || addMutation.isPending}
                  onClick={() => {
                    if (!item.variantId) return;
                    setError(null);
                    addMutation.mutate({
                      productId: item.productId,
                      variantId: item.variantId,
                      quantity: 1,
                    });
                  }}
                  className="rounded-md bg-[var(--color-button-background)] px-3 py-2 text-sm font-medium text-[var(--color-button-foreground)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                >
                  Add to cart
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${item.productName} from wishlist`}
                  disabled={removeMutation.isPending}
                  onClick={() =>
                    removeMutation.mutate({ wishlistItemId: item.id })
                  }
                  className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
