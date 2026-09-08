"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addToCartAction } from "@/features/cart/actions";
import { QuantityStepper } from "@/features/cart/components/QuantityStepper";
import { cartQueryKey } from "@/features/cart/query-keys";
import { CART_MAX_QUANTITY } from "@/features/cart/types";
import {
  isInWishlistAction,
  toggleWishlistAction,
} from "@/features/wishlist/actions";
import { wishlistQueryKey } from "@/features/wishlist/query-keys";

interface ProductPurchaseActionsProps {
  productId: string;
  productSlug: string;
  variantId: string;
  maxAvailable: number | null;
  outOfStock: boolean;
  isAuthenticated: boolean;
}

export function ProductPurchaseActions({
  productId,
  productSlug,
  variantId,
  maxAvailable,
  outOfStock,
  isAuthenticated,
}: ProductPurchaseActionsProps) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maxQty = Math.min(
    CART_MAX_QUANTITY,
    maxAvailable == null ? CART_MAX_QUANTITY : Math.max(1, maxAvailable),
  );

  const wishlistQuery = useQuery({
    queryKey: [...wishlistQueryKey, productId, variantId],
    queryFn: () => isInWishlistAction({ productId, variantId }),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const addMutation = useMutation({
    mutationFn: addToCartAction,
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error);
        setMessage(null);
        return;
      }
      setError(null);
      setMessage(result.message ?? "Added to cart.");
      queryClient.setQueryData(cartQueryKey, result.cart);
      void queryClient.invalidateQueries({ queryKey: cartQueryKey });
    },
  });

  const wishlistMutation = useMutation({
    mutationFn: () => toggleWishlistAction({ productId, variantId }),
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setMessage(result.message ?? "Wishlist updated.");
      void queryClient.invalidateQueries({
        queryKey: [...wishlistQueryKey, productId, variantId],
      });
      void queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
    },
  });

  return (
    <div className="space-y-3">
      <QuantityStepper
        value={quantity}
        max={maxQty}
        disabled={outOfStock}
        onChange={setQuantity}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={outOfStock || addMutation.isPending}
          onClick={() => {
            setError(null);
            setMessage(null);
            addMutation.mutate({ productId, variantId, quantity });
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--color-button-background)] px-4 py-2.5 text-sm font-medium text-[var(--color-button-foreground)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {outOfStock ? "Out of stock" : "Add to cart"}
        </button>

        {isAuthenticated ? (
          <button
            type="button"
            disabled={wishlistMutation.isPending}
            aria-pressed={Boolean(wishlistQuery.data)}
            onClick={() => wishlistMutation.mutate()}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {wishlistQuery.data ? "Remove from wishlist" : "Add to wishlist"}
          </button>
        ) : (
          <a
            href={`/login?next=${encodeURIComponent(`/products/${productSlug}`)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Sign in to save
          </a>
        )}
      </div>

      {message ? (
        <p className="text-sm text-green-700" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
