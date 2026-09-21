"use client";

import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useHasHydrated } from "@/lib/use-has-hydrated";
import {
  getWishlistMembershipKeysAction,
  toggleWishlistAction,
} from "@/features/wishlist/actions";
import {
  wishlistMembershipKey,
  wishlistMembershipQueryKey,
} from "@/features/wishlist/query-keys";
import { syncWishlistQueryCaches } from "@/features/wishlist/sync-wishlist-query";
import { cn } from "@/lib/cn";

type ProductWishlistButtonProps = {
  productId: string;
  productSlug: string;
  variantId: string;
  isAuthenticated: boolean;
  className?: string;
};

export function ProductWishlistButton({
  productId,
  productSlug,
  variantId,
  isAuthenticated,
  className,
}: ProductWishlistButtonProps) {
  const queryClient = useQueryClient();
  const hydrated = useHasHydrated();
  const [error, setError] = useState<string | null>(null);

  const membershipQuery = useQuery({
    queryKey: wishlistMembershipQueryKey,
    queryFn: () => getWishlistMembershipKeysAction(),
    enabled: hydrated && isAuthenticated,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const membershipSet = useMemo(
    () => new Set(membershipQuery.data ?? []),
    [membershipQuery.data],
  );

  const inWishlist = membershipSet.has(
    wishlistMembershipKey(productId, variantId),
  );

  const wishlistMutation = useMutation({
    mutationFn: () => toggleWishlistAction({ productId, variantId }),
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      if (result.wishlist) syncWishlistQueryCaches(queryClient, result.wishlist);
    },
  });

  const btnClass = cn(
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-card)]/95 text-[var(--color-foreground)] shadow-sm backdrop-blur transition-colors hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-50",
    className,
  );

  if (!isAuthenticated) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/products/${productSlug}`)}`}
        aria-label="Sign in to add to wishlist"
        className={btnClass}
      >
        <FavoriteBorderIcon sx={{ fontSize: 22 }} aria-hidden />
      </Link>
    );
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        disabled={wishlistMutation.isPending}
        aria-pressed={inWishlist}
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        onClick={() => wishlistMutation.mutate()}
        className={btnClass}
      >
        {inWishlist ? (
          <FavoriteIcon
            sx={{ fontSize: 22 }}
            className="!text-[var(--color-primary)]"
            aria-hidden
          />
        ) : (
          <FavoriteBorderIcon sx={{ fontSize: 22 }} aria-hidden />
        )}
      </button>
      {error ? (
        <span className="sr-only" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
