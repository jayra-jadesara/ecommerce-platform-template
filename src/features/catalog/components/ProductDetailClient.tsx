"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Chip from "@mui/material/Chip";
import { formatMoney } from "@/features/catalog/money";
import type { StorefrontProductDetail } from "@/features/catalog/types";

interface ProductDetailClientProps {
  product: StorefrontProductDetail;
  currency: string;
}

const stockColor: Record<string, "default" | "success" | "warning" | "error"> = {
  IN_STOCK: "success",
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "error",
};

export function ProductDetailClient({
  product,
  currency,
}: ProductDetailClientProps) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [activeImageId, setActiveImageId] = useState(
    product.images.find((image) => image.isPrimary)?.id ??
      product.images[0]?.id ??
      "",
  );

  const selected = useMemo(
    () =>
      product.variants.find((variant) => variant.id === variantId) ??
      product.variants[0],
    [product.variants, variantId],
  );

  const galleryImages = useMemo(() => {
    if (!product.images.length) return [];
    if (!selected) return product.images;
    const variantSpecific = product.images.filter(
      (image) => image.variantId === selected.id,
    );
    if (variantSpecific.length) return variantSpecific;
    return product.images.filter((image) => !image.variantId);
  }, [product.images, selected]);

  const activeImage =
    galleryImages.find((image) => image.id === activeImageId) ??
    galleryImages[0];

  if (!selected) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        No active variants are available for this product.
      </p>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-3">
        <div className="relative flex min-h-72 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {activeImage ? (
            <Image
              src={activeImage.url}
              alt={activeImage.altText || product.name}
              fill
              priority
              className="object-contain p-2"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <p
              className="text-sm text-[var(--color-muted)]"
              role="img"
              aria-label="Product image placeholder"
            >
              No product image available
            </p>
          )}
        </div>
        {galleryImages.length > 1 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Product gallery">
            {galleryImages.map((image) => {
              const active = image.id === activeImage?.id;
              return (
                <li key={image.id}>
                  <button
                    type="button"
                    aria-label={`Show ${image.altText || "product image"}`}
                    aria-pressed={active}
                    className={`relative h-16 w-16 overflow-hidden rounded-md border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                      active
                        ? "border-[var(--color-primary)]"
                        : "border-[var(--color-border)]"
                    }`}
                    onClick={() => setActiveImageId(image.id)}
                  >
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                      loading="lazy"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="space-y-5">
        <div>
          {product.category ? (
            <p className="text-sm text-[var(--color-muted)]">
              {product.category.name}
            </p>
          ) : null}
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {product.name}
          </h1>
          {product.brand ? (
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {product.brand}
            </p>
          ) : null}
          {product.featured ? (
            <Chip
              size="small"
              label="Featured"
              className="mt-2"
              color="primary"
            />
          ) : null}
        </div>

        {product.shortDescription ? (
          <p className="text-[var(--color-muted)]">{product.shortDescription}</p>
        ) : null}

        <div>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {formatMoney(selected.price, currency)}
          </p>
          {selected.compareAtPrice != null &&
          selected.compareAtPrice > selected.price ? (
            <p className="text-sm text-[var(--color-muted)] line-through">
              {formatMoney(selected.compareAtPrice, currency)}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Chip
              size="small"
              label={selected.stockStatus.replaceAll("_", " ")}
              color={stockColor[selected.stockStatus]}
            />
            <span className="text-xs text-[var(--color-muted)]">
              SKU {selected.sku}
              {selected.stockStatus !== "OUT_OF_STOCK" || selected.available > 0
                ? ` · ${selected.available} available`
                : ""}
            </span>
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Options</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => {
              const active = variant.id === selected.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => {
                    setVariantId(variant.id);
                    const nextImages = product.images.filter(
                      (image) =>
                        image.variantId === variant.id || !image.variantId,
                    );
                    const preferred =
                      nextImages.find((image) => image.variantId === variant.id) ??
                      nextImages.find((image) => image.isPrimary) ??
                      nextImages[0];
                    if (preferred) setActiveImageId(preferred.id);
                  }}
                  className={`rounded-md border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                    active
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                      : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)]"
                  }`}
                  aria-pressed={active}
                >
                  {variant.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <p className="text-sm text-[var(--color-muted)]">
          Cart and checkout arrive in a later phase.
        </p>

        {product.description ? (
          <section>
            <h2 className="font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-muted)]">
              {product.description}
            </p>
          </section>
        ) : null}
        {product.ingredients ? (
          <section>
            <h2 className="font-semibold">Ingredients</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-muted)]">
              {product.ingredients}
            </p>
          </section>
        ) : null}
        {product.usageInstructions ? (
          <section>
            <h2 className="font-semibold">Usage</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-muted)]">
              {product.usageInstructions}
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
