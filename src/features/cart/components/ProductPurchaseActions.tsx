"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buyPending, setBuyPending] = useState(false);

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

  async function buyNow() {
    setError(null);
    setMessage(null);
    setBuyPending(true);
    try {
      const result = await addToCartAction({ productId, variantId, quantity });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      queryClient.setQueryData(cartQueryKey, result.cart);
      void queryClient.invalidateQueries({ queryKey: cartQueryKey });
      router.push("/checkout");
    } catch {
      setError("Could not start checkout.");
    } finally {
      setBuyPending(false);
    }
  }

  const busy = addMutation.isPending || buyPending;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={quantity}
          max={maxQty}
          disabled={outOfStock}
          onChange={setQuantity}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={outOfStock || busy}
          onClick={() => {
            setError(null);
            setMessage(null);
            addMutation.mutate({ productId, variantId, quantity });
          }}
          className={cn(sfBtn("primary"), "min-w-[9rem] flex-1 sm:flex-none")}
        >
          {outOfStock ? "Out of stock" : "Add to cart"}
        </button>

        <button
          type="button"
          disabled={outOfStock || busy}
          onClick={() => void buyNow()}
          className={cn(sfBtn("outline"), "min-w-[9rem] flex-1 sm:flex-none")}
        >
          {buyPending ? "Starting…" : "Buy now"}
        </button>

        {isAuthenticated ? (
          <button
            type="button"
            disabled={wishlistMutation.isPending}
            aria-pressed={Boolean(wishlistQuery.data)}
            onClick={() => wishlistMutation.mutate()}
            className={sfBtn("ghost")}
          >
            {wishlistQuery.data ? "Saved" : "Wishlist"}
          </button>
        ) : (
          <a
            href={`/login?next=${encodeURIComponent(`/products/${productSlug}`)}`}
            className={sfBtn("ghost")}
          >
            Sign in to save
          </a>
        )}
      </div>

      {message ? (
        <p className="text-sm text-[var(--color-success)]" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
