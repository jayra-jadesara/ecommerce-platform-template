"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addToCartAction } from "@/features/cart/actions";
import { cartQueryKey } from "@/features/cart/query-keys";
import { formatMoney } from "@/features/catalog/money";
import type { StorefrontProductCard } from "@/features/catalog/storefront";

interface ProductCardProps {
  product: StorefrontProductCard;
  currency: string;
}

export function ProductCard({ product, currency }: ProductCardProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const needsOptions = (product.activeVariantCount ?? 0) > 1;
  const canQuickAdd =
    product.activeVariantCount === 1 &&
    Boolean(product.defaultVariantId) &&
    product.stockStatus !== "OUT_OF_STOCK";

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

  const priceLabel =
    product.minPrice == null
      ? "Price unavailable"
      : product.minPrice === product.maxPrice
        ? formatMoney(product.minPrice, currency)
        : `${formatMoney(product.minPrice, currency)} – ${formatMoney(product.maxPrice!, currency)}`;

  return (
    <article className="flex h-full flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <Link
        href={`/products/${product.slug}`}
        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      >
        <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-border)_30%)]">
          {product.primaryImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.primaryImageUrl}
              alt={product.primaryImageAlt || product.name}
              className="h-full w-full object-contain p-2"
              loading="lazy"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-[var(--color-muted)]">
              No image
            </span>
          )}
        </div>
        <p className="font-medium text-[var(--color-foreground)]">
          {product.name}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {product.categoryName ?? "Uncategorized"}
          {product.featured ? " · Featured" : ""}
        </p>
        <p className="mt-2 text-sm font-semibold">{priceLabel}</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {product.stockStatus.replaceAll("_", " ")}
        </p>
      </Link>

      <div className="mt-auto pt-3">
        {needsOptions ? (
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex w-full items-center justify-center rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Choose options
          </Link>
        ) : (
          <button
            type="button"
            disabled={!canQuickAdd || addMutation.isPending}
            onClick={() => {
              if (!product.defaultVariantId) return;
              setError(null);
              setMessage(null);
              addMutation.mutate({
                productId: product.id,
                variantId: product.defaultVariantId,
                quantity: 1,
              });
            }}
            className="inline-flex w-full items-center justify-center rounded-md bg-[var(--color-button-background)] px-3 py-2 text-sm font-medium text-[var(--color-button-foreground)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {product.stockStatus === "OUT_OF_STOCK"
              ? "Out of stock"
              : "Add to cart"}
          </button>
        )}
        {message ? (
          <p className="mt-2 text-xs text-green-700" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 text-xs text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </article>
  );
}
