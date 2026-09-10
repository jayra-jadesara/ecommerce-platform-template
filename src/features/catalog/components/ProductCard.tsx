"use client";

import Image from "next/image";
import Link from "next/link";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import SearchIcon from "@mui/icons-material/Search";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addToCartAction } from "@/features/cart/actions";
import { cartQueryKey } from "@/features/cart/query-keys";
import { formatMoney } from "@/features/catalog/money";
import type { StorefrontProductCard } from "@/features/catalog/storefront";
import { QuickView } from "@/features/catalog/components/QuickView";
import { sfBtn } from "@/components/ui/storefront-classes";
import {
  isInWishlistAction,
  toggleWishlistAction,
} from "@/features/wishlist/actions";
import { wishlistQueryKey } from "@/features/wishlist/query-keys";
import { cn } from "@/lib/cn";

interface ProductCardProps {
  product: StorefrontProductCard;
  currency: string;
  isAuthenticated?: boolean;
}

export function ProductCard({
  product,
  currency,
  isAuthenticated = false,
}: ProductCardProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);

  const variantOptions = product.variantOptions ?? [];
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.defaultVariantId ?? variantOptions[0]?.id ?? null,
  );

  const selectedOption = useMemo(
    () =>
      variantOptions.find((v) => v.id === selectedVariantId) ??
      variantOptions[0] ??
      null,
    [variantOptions, selectedVariantId],
  );

  const hasVariants = variantOptions.length > 1;
  const canAdd =
    Boolean(selectedOption) &&
    selectedOption!.available &&
    product.stockStatus !== "OUT_OF_STOCK";

  const displayPrice = selectedOption?.price ?? product.minPrice;
  const displayCompare =
    selectedOption?.compareAtPrice ?? product.compareAtPrice ?? null;

  const discountPct =
    displayCompare != null &&
    displayPrice != null &&
    displayCompare > displayPrice
      ? Math.round(((displayCompare - displayPrice) / displayCompare) * 100)
      : null;

  const wishlistVariantId =
    selectedOption?.id ?? product.defaultVariantId ?? null;

  const wishlistQuery = useQuery({
    queryKey: [...wishlistQueryKey, product.id, wishlistVariantId],
    queryFn: () =>
      isInWishlistAction({
        productId: product.id,
        variantId: wishlistVariantId!,
      }),
    enabled: isAuthenticated && Boolean(wishlistVariantId),
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
      setMessage("Added to cart.");
      queryClient.setQueryData(cartQueryKey, result.cart);
      void queryClient.invalidateQueries({ queryKey: cartQueryKey });
    },
  });

  const wishlistMutation = useMutation({
    mutationFn: () =>
      toggleWishlistAction({
        productId: product.id,
        variantId: wishlistVariantId!,
      }),
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setMessage(result.message ?? "Wishlist updated.");
      void queryClient.invalidateQueries({
        queryKey: [...wishlistQueryKey, product.id, wishlistVariantId],
      });
      void queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
    },
  });

  const priceLabel =
    displayPrice == null
      ? "Price unavailable"
      : !selectedOption &&
          product.minPrice != null &&
          product.maxPrice != null &&
          product.minPrice !== product.maxPrice
        ? `From ${formatMoney(product.minPrice, currency)}`
        : formatMoney(displayPrice, currency);

  const inWishlist = Boolean(wishlistQuery.data);

  return (
    <article className="group relative flex h-full w-full min-w-0 flex-col overflow-hidden sf-product-tile">
      <div className="relative">
        <Link
          href={`/products/${product.slug}`}
          className="relative block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))]">
            {product.primaryImageUrl ? (
              <>
                <Image
                  src={product.primaryImageUrl}
                  alt={product.primaryImageAlt || product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 240px"
                  className={cn(
                    "object-contain p-4 transition-transform duration-500 motion-safe:group-hover:scale-105",
                    product.secondaryImageUrl &&
                      "motion-safe:group-hover:opacity-0",
                  )}
                  loading="lazy"
                />
                {product.secondaryImageUrl ? (
                  <Image
                    src={product.secondaryImageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, 240px"
                    className="object-contain p-4 opacity-0 transition-opacity duration-500 motion-safe:group-hover:opacity-100"
                    loading="lazy"
                    aria-hidden
                  />
                ) : null}
              </>
            ) : (
              <span
                className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--color-primary)_28%,transparent),transparent_55%)] text-sm font-medium text-[var(--color-muted)]"
                role="img"
                aria-label={`${product.name} placeholder`}
              >
                {product.name.slice(0, 1).toUpperCase()}
              </span>
            )}

            <div className="absolute left-2 top-2 flex flex-col gap-1">
              {discountPct != null && discountPct > 0 ? (
                <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-button-foreground)]">
                  −{discountPct}%
                </span>
              ) : null}
              {product.stockStatus === "OUT_OF_STOCK" ? (
                <span className="rounded-full bg-[var(--color-card)]/95 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted)] shadow-sm">
                  Sold out
                </span>
              ) : null}
            </div>
          </div>
        </Link>

        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            aria-label={`Quick view ${product.name}`}
            onClick={() => setQuickOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <SearchIcon fontSize="small" />
          </button>
          {isAuthenticated && wishlistVariantId ? (
            <button
              type="button"
              aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
              disabled={wishlistMutation.isPending}
              onClick={() => wishlistMutation.mutate()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm transition-colors hover:border-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              {inWishlist ? (
                <FavoriteIcon fontSize="small" className="!text-[var(--color-primary)]" />
              ) : (
                <FavoriteBorderIcon fontSize="small" />
              )}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <Link
          href={`/products/${product.slug}`}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {product.categoryName ? (
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
              {product.categoryName}
            </p>
          ) : null}
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-foreground)] sm:text-[0.95rem]">
            {product.name}
          </h3>
        </Link>

        {hasVariants ? (
          <div
            className="mt-1 flex flex-wrap gap-1"
            role="listbox"
            aria-label={`${product.name} options`}
          >
            {variantOptions.slice(0, 4).map((opt) => {
              const active = opt.id === selectedOption?.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={!opt.available}
                  onClick={() => setSelectedVariantId(opt.id)}
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-[10px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)]",
                    active
                      ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))]"
                      : "border-[var(--color-border)] text-[var(--color-muted)]",
                    !opt.available && "opacity-40",
                  )}
                >
                  {opt.name}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <p className="text-sm font-semibold tabular-nums text-[var(--color-foreground)] sm:text-base">
            {priceLabel}
          </p>
          {displayCompare != null &&
          displayPrice != null &&
          displayCompare > displayPrice ? (
            <p className="text-xs tabular-nums text-[var(--color-muted)] line-through">
              {formatMoney(displayCompare, currency)}
            </p>
          ) : null}
        </div>

        <div className="mt-auto pt-3">
          {hasVariants && !selectedOption ? (
            <Link
              href={`/products/${product.slug}`}
              className={cn(sfBtn("primary"), "w-full text-sm")}
            >
              Choose options
            </Link>
          ) : (
            <button
              type="button"
              disabled={!canAdd || addMutation.isPending}
              onClick={() => {
                if (!selectedOption) return;
                setError(null);
                setMessage(null);
                addMutation.mutate({
                  productId: product.id,
                  variantId: selectedOption.id,
                  quantity: 1,
                });
              }}
              className={cn(sfBtn("primary"), "w-full text-sm")}
            >
              {product.stockStatus === "OUT_OF_STOCK" ||
              !selectedOption?.available
                ? "Out of stock"
                : addMutation.isPending
                  ? "Adding…"
                  : hasVariants
                    ? "Add to cart"
                    : "Add to cart"}
            </button>
          )}
          {message ? (
            <p className="mt-2 text-xs text-[var(--color-success)]" role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 text-xs text-[var(--color-error)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {quickOpen ? (
        <QuickView
          slug={product.slug}
          currency={currency}
          open={quickOpen}
          onClose={() => setQuickOpen(false)}
        />
      ) : null}
    </article>
  );
}
