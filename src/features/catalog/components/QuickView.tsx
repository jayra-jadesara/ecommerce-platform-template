"use client";

import Image from "next/image";
import Link from "next/link";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addToCartAction } from "@/features/cart/actions";
import { QuantityStepper } from "@/features/cart/components/QuantityStepper";
import { cartQueryKey } from "@/features/cart/query-keys";
import { CART_MAX_QUANTITY } from "@/features/cart/types";
import { getProductQuickViewAction } from "@/features/catalog/quick-view-action";
import { formatMoney } from "@/features/catalog/money";
import type { StorefrontProductDetail } from "@/features/catalog/types";
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

export type QuickViewProps = {
  slug: string | null;
  currency: string;
  open: boolean;
  onClose: () => void;
};

export function QuickView({ slug, currency, open, onClose }: QuickViewProps) {
  const productQuery = useQuery({
    queryKey: ["quick-view", slug],
    queryFn: () => getProductQuickViewAction(slug!),
    enabled: open && Boolean(slug),
    staleTime: 60_000,
  });

  const product = productQuery.data ?? null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          className:
            "!bg-[var(--color-card)] !text-[var(--color-foreground)] !rounded-[var(--radius-default,1rem)]",
          "aria-label": "Quick view product",
        },
      }}
    >
      <DialogContent className="!p-0">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Quick view
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Close
          </button>
        </div>

        {productQuery.isLoading ? (
          <div className="grid gap-4 p-5 sm:grid-cols-2" aria-busy>
            <div className="aspect-square animate-pulse rounded-[var(--radius-default,0.75rem)] bg-[var(--color-surface)]" />
            <div className="space-y-3">
              <div className="h-6 w-2/3 animate-pulse rounded bg-[var(--color-surface)]" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--color-surface)]" />
              <div className="h-10 w-full animate-pulse rounded bg-[var(--color-surface)]" />
            </div>
          </div>
        ) : !product ? (
          <p className="p-6 text-sm text-[var(--color-muted)]" role="status">
            This product is unavailable.
          </p>
        ) : (
          <QuickViewBody
            key={product.id}
            product={product}
            currency={currency}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function QuickViewBody({
  product,
  currency,
  onClose,
}: {
  product: StorefrontProductDetail;
  currency: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(
    () =>
      product.variants.find((v) => v.id === variantId) ?? product.variants[0],
    [product.variants, variantId],
  );

  const image =
    product.images.find((img) => img.variantId === selected?.id) ??
    product.images.find((img) => img.isPrimary) ??
    product.images[0];

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

  if (!selected) {
    return (
      <p className="p-6 text-sm text-[var(--color-muted)]" role="status">
        This product is unavailable.
      </p>
    );
  }

  const outOfStock = selected.stockStatus === "OUT_OF_STOCK";
  const maxQty = Math.min(
    CART_MAX_QUANTITY,
    selected.available != null && selected.available > 0
      ? selected.available
      : CART_MAX_QUANTITY,
  );

  const discountPct =
    selected.compareAtPrice != null &&
    selected.compareAtPrice > selected.price
      ? Math.round(
          ((selected.compareAtPrice - selected.price) /
            selected.compareAtPrice) *
            100,
        )
      : null;

  return (
    <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))]">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText || product.name}
            fill
            className="object-contain p-4"
            sizes="(max-width: 640px) 100vw, 320px"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-[var(--color-muted)]">
            No image
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {product.category ? (
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {product.category.name}
          </p>
        ) : null}
        <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold leading-snug">
          {product.name}
        </h3>

        <div className="flex flex-wrap items-baseline gap-2">
          <p className="text-2xl font-semibold tabular-nums">
            {formatMoney(selected.price, currency)}
          </p>
          {selected.compareAtPrice != null &&
          selected.compareAtPrice > selected.price ? (
            <>
              <p className="text-sm tabular-nums text-[var(--color-muted)] line-through">
                {formatMoney(selected.compareAtPrice, currency)}
              </p>
              {discountPct != null ? (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] px-2 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
                  −{discountPct}%
                </span>
              ) : null}
            </>
          ) : null}
        </div>

        <p className="text-sm text-[var(--color-muted)]">
          {selected.stockStatus === "OUT_OF_STOCK"
            ? "Out of stock"
            : selected.stockStatus === "LOW_STOCK"
              ? "Limited stock"
              : "In stock"}
        </p>

        {product.variants.length > 1 ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Size / option</legend>
            <div className="flex flex-wrap gap-2" role="listbox" aria-label="Options">
              {product.variants.map((variant) => {
                const active = variant.id === selected.id;
                const soldOut = variant.stockStatus === "OUT_OF_STOCK";
                return (
                  <button
                    key={variant.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={soldOut}
                    onClick={() => setVariantId(variant.id)}
                    className={cn(
                      "min-h-10 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                      active
                        ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[var(--color-foreground)]"
                        : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]",
                      soldOut && "opacity-40",
                    )}
                  >
                    {variant.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <QuantityStepper
          value={quantity}
          max={maxQty}
          disabled={outOfStock}
          onChange={setQuantity}
        />

        <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row">
          <button
            type="button"
            disabled={outOfStock || addMutation.isPending}
            onClick={() => {
              setError(null);
              setMessage(null);
              addMutation.mutate({
                productId: product.id,
                variantId: selected.id,
                quantity,
              });
            }}
            className={cn(sfBtn("primary"), "w-full sm:flex-1")}
          >
            {outOfStock
              ? "Out of stock"
              : addMutation.isPending
                ? "Adding…"
                : "Add to cart"}
          </button>
          <Link
            href={`/products/${product.slug}`}
            onClick={onClose}
            className={cn(sfBtn("outline"), "w-full sm:flex-1")}
          >
            View details
          </Link>
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
    </div>
  );
}
