"use client";

import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useHasHydrated } from "@/lib/use-has-hydrated";
import { addToCartAction } from "@/features/cart/actions";
import { QuantityStepper } from "@/features/cart/components/QuantityStepper";
import { cartQueryKey } from "@/features/cart/query-keys";
import { CART_MAX_QUANTITY } from "@/features/cart/types";
import {
  getWishlistMembershipKeysAction,
  toggleWishlistAction,
} from "@/features/wishlist/actions";
import {
  wishlistMembershipKey,
  wishlistMembershipQueryKey,
  wishlistQueryKey,
} from "@/features/wishlist/query-keys";
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

interface ProductPurchaseActionsProps {
  productId: string;
  productSlug: string;
  variantId: string;
  maxAvailable: number | null;
  outOfStock: boolean;
  isAuthenticated: boolean;
  /** Content above the qty + CTA row (price, stock, options…). */
  leading?: ReactNode;
  /**
   * `rail` — price/options, then qty + medium CTAs in one horizontal row (PDP).
   * `stack` — quantity then wider button row (default / mobile chrome).
   */
  layout?: "rail" | "stack";
}

export function ProductPurchaseActions({
  productId,
  productSlug,
  variantId,
  maxAvailable,
  outOfStock,
  isAuthenticated,
  leading,
  layout = "stack",
}: ProductPurchaseActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buyPending, setBuyPending] = useState(false);
  const hydrated = useHasHydrated();

  const maxQty = Math.min(
    CART_MAX_QUANTITY,
    maxAvailable == null ? CART_MAX_QUANTITY : Math.max(1, maxAvailable),
  );

  const membershipQuery = useQuery({
    queryKey: wishlistMembershipQueryKey,
    queryFn: () => getWishlistMembershipKeysAction(),
    enabled: hydrated && isAuthenticated,
    staleTime: 60_000,
  });

  const membershipSet = useMemo(
    () => new Set(membershipQuery.data ?? []),
    [membershipQuery.data],
  );

  const inWishlist = membershipSet.has(
    wishlistMembershipKey(productId, variantId),
  );

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
        queryKey: wishlistMembershipQueryKey,
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
      setError("Could not start Buy it now.");
    } finally {
      setBuyPending(false);
    }
  }

  const busy = addMutation.isPending || buyPending;

  const railBtn = "min-h-10 justify-center !px-3 !text-sm";
  const stackBtn =
    "min-h-11 w-full justify-center sm:w-auto sm:min-w-[9.5rem]";
  const btnClass = layout === "rail" ? railBtn : stackBtn;
  const railBtnStyle: CSSProperties | undefined =
    layout === "rail"
      ? { width: "9.75rem", flexShrink: 0 }
      : undefined;

  const actionButtons = (
    <>
      <button
        type="button"
        disabled={outOfStock || busy}
        onClick={() => {
          setError(null);
          setMessage(null);
          addMutation.mutate({ productId, variantId, quantity });
        }}
        className={cn(sfBtn("outline"), btnClass)}
        style={railBtnStyle}
      >
        {outOfStock ? "Out of stock" : "Add to cart"}
      </button>

      <button
        type="button"
        disabled={outOfStock || busy}
        onClick={() => void buyNow()}
        className={cn(sfBtn("primary"), btnClass)}
        style={railBtnStyle}
      >
        {buyPending ? "Starting…" : "Buy it now"}
      </button>

      {isAuthenticated ? (
        <button
          type="button"
          disabled={wishlistMutation.isPending}
          aria-pressed={inWishlist}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          onClick={() => wishlistMutation.mutate()}
          className={cn(
            layout === "rail" ? sfBtn("outline") : sfBtn("ghost"),
            btnClass,
            "gap-1.5",
          )}
          style={railBtnStyle}
        >
          {inWishlist ? (
            <FavoriteIcon
              fontSize="small"
              className="!text-[var(--color-primary)]"
              aria-hidden
            />
          ) : (
            <FavoriteBorderIcon fontSize="small" aria-hidden />
          )}
          <span>{inWishlist ? "Saved" : "Wishlist"}</span>
        </button>
      ) : (
        <a
          href={`/login?next=${encodeURIComponent(`/products/${productSlug}`)}`}
          className={cn(
            layout === "rail" ? sfBtn("outline") : sfBtn("ghost"),
            btnClass,
            "gap-1.5",
          )}
          style={railBtnStyle}
        >
          <FavoriteBorderIcon fontSize="small" aria-hidden />
          <span>{layout === "rail" ? "Wishlist" : "Sign in to save"}</span>
        </a>
      )}
    </>
  );

  const statusMessages = (
    <>
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
    </>
  );

  if (layout === "rail") {
    return (
      <div className="space-y-3.5">
        {leading ? <div className="space-y-3">{leading}</div> : null}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <QuantityStepper
            value={quantity}
            max={maxQty}
            disabled={outOfStock}
            onChange={setQuantity}
          />
          {actionButtons}
        </div>
        {statusMessages}
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {leading}
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={quantity}
          max={maxQty}
          disabled={outOfStock}
          onChange={setQuantity}
        />
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        {actionButtons}
      </div>

      {statusMessages}
    </div>
  );
}
