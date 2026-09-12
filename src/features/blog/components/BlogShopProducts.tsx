"use client";

import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import {
  getWishlistMembershipKeysAction,
  toggleWishlistAction,
} from "@/features/wishlist/actions";
import {
  wishlistMembershipKey,
  wishlistMembershipQueryKey,
  wishlistQueryKey,
} from "@/features/wishlist/query-keys";
import { useHasHydrated } from "@/lib/use-has-hydrated";

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
  const hydrated = useHasHydrated();

  const membershipQuery = useQuery({
    queryKey: wishlistMembershipQueryKey,
    queryFn: () => getWishlistMembershipKeysAction(),
    enabled: hydrated,
    staleTime: 30_000,
  });

  const membershipSet = useMemo(
    () => new Set(membershipQuery.data ?? []),
    [membershipQuery.data],
  );

  const mutation = useMutation({
    mutationFn: () => toggleWishlistAction({ productId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: wishlistMembershipQueryKey,
      });
      await queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
    },
  });

  const inWishlist =
    hydrated && membershipSet.has(wishlistMembershipKey(productId, null));

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
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
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
    </button>
  );
}

export function BlogShopProducts({
  products,
}: {
  products: BlogShopProduct[];
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
            <ProductWishlistButton
              productId={product.id}
              productName={product.name}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
