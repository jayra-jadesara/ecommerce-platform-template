"use client";

import AddShoppingCartRoundedIcon from "@mui/icons-material/AddShoppingCartRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { sfBtn } from "@/components/ui/storefront-classes";
import { addToCartAction } from "@/features/cart/actions";
import { syncCartQueryCaches } from "@/features/cart/sync-cart-query";
import { formatMoney } from "@/features/catalog/money";
import {
  getWishlistAction,
  removeFromWishlistAction,
} from "@/features/wishlist/actions";
import { wishlistQueryKey } from "@/features/wishlist/query-keys";
import { syncWishlistQueryCaches } from "@/features/wishlist/sync-wishlist-query";
import type { WishlistView } from "@/features/wishlist/types";
import { cn } from "@/lib/cn";

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
      syncWishlistQueryCaches(queryClient, result.wishlist);
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
      syncCartQueryCaches(queryClient, result.cart);
    },
  });

  if (wishlist.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-5 py-10 text-center">
        <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]">
          <FavoriteBorderRoundedIcon className="!text-xl" aria-hidden />
        </span>
        <h2 className="mt-3 text-base font-semibold">Your wishlist is empty</h2>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Save products while browsing to find them here later.
        </p>
        <Link
          href="/products"
          className="mt-3 inline-flex text-xs font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-xs text-[var(--color-error)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-[var(--color-success)]" role="status">
          {message}
        </p>
      ) : null}

      <ul
        className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]"
        aria-label="Wishlist items"
      >
        {wishlist.items.map((item) => {
          const inStock = item.stockStatus === "IN_STOCK";
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 px-3 py-2.5 sm:gap-3.5 sm:px-3.5"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.imageAlt}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-[10px] text-[var(--color-muted)]">
                    —
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                {item.productSlug ? (
                  <Link
                    href={`/products/${item.productSlug}`}
                    className="block truncate text-sm font-semibold leading-snug hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                  >
                    {item.productName}
                  </Link>
                ) : (
                  <p className="truncate text-sm font-semibold leading-snug">
                    {item.productName}
                  </p>
                )}
                <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted)]">
                  {[
                    item.variantName,
                    item.unitPrice != null
                      ? formatMoney(item.unitPrice, wishlist.currency)
                      : null,
                    inStock
                      ? "In stock"
                      : item.stockStatus === "UNAVAILABLE"
                        ? "Unavailable"
                        : item.stockStatus.replaceAll("_", " ").toLowerCase(),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  disabled={
                    !item.canAddToCart || !item.variantId || addMutation.isPending
                  }
                  title="Add to cart"
                  aria-label={`Add ${item.productName} to cart`}
                  onClick={() => {
                    if (!item.variantId) return;
                    setError(null);
                    addMutation.mutate({
                      productId: item.productId,
                      variantId: item.variantId,
                      quantity: 1,
                    });
                  }}
                  className={cn(
                    sfBtn("primary"),
                    "!min-h-8 !gap-1 !rounded-lg !px-2.5 !py-1.5 !text-xs",
                  )}
                >
                  <AddShoppingCartRoundedIcon
                    className="!text-[1rem]"
                    aria-hidden
                  />
                  <span className="hidden sm:inline">Add</span>
                </button>
                <button
                  type="button"
                  title="Remove"
                  aria-label={`Remove ${item.productName} from wishlist`}
                  disabled={removeMutation.isPending}
                  onClick={() =>
                    removeMutation.mutate({ wishlistItemId: item.id })
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-error)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-50"
                >
                  <DeleteOutlineRoundedIcon
                    className="!text-[1.05rem]"
                    aria-hidden
                  />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
