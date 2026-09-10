"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Chip from "@mui/material/Chip";
import { ProductPurchaseActions } from "@/features/cart/components/ProductPurchaseActions";
import { DeliveryInfoBlock } from "@/features/catalog/components/DeliveryInfoBlock";
import { formatMoney } from "@/features/catalog/money";
import type { StorefrontProductDetail } from "@/features/catalog/types";
import type { VisualEffectsConfig, AnimationConfig } from "@/types";
import { sfDisplay, sfEyebrow } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

const Product3DViewer = dynamic(
  () =>
    import("@/components/three/Product3DViewer").then((m) => m.Product3DViewer),
  { ssr: false },
);

interface ProductDetailClientProps {
  product: StorefrontProductDetail;
  currency: string;
  isAuthenticated: boolean;
  visualEffects: VisualEffectsConfig;
  animation: AnimationConfig;
}

const stockColor: Record<string, "default" | "success" | "warning" | "error"> = {
  IN_STOCK: "success",
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "error",
};

export function ProductDetailClient({
  product,
  currency,
  isAuthenticated,
  visualEffects,
  animation,
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

  const discountPct =
    selected.compareAtPrice != null &&
    selected.compareAtPrice > selected.price
      ? Math.round(
          ((selected.compareAtPrice - selected.price) /
            selected.compareAtPrice) *
            100,
        )
      : null;

  const galleryFallback = (
    <div className="relative h-full w-full">
      {activeImage ? (
        <Image
          src={activeImage.url}
          alt={activeImage.altText || product.name}
          fill
          priority
          className="object-contain p-4 md:p-6"
          sizes="(max-width: 1024px) 100vw, 520px"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          role="img"
          aria-label="Product image placeholder"
          style={{
            background:
              "radial-gradient(circle at 40% 35%, color-mix(in srgb, var(--color-primary) 28%, transparent), transparent 60%), var(--color-surface)",
          }}
        >
          <span className="text-sm text-[var(--color-muted)]">
            No product image
          </span>
        </div>
      )}
    </div>
  );

  const product3dEligible =
    Boolean(product.modelPath) &&
    visualEffects.enabled &&
    visualEffects.productEnabled;

  const galleryShellClass =
    "relative mx-auto aspect-square w-full overflow-hidden rounded-[var(--radius-default,1rem)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-border)_30%)] lg:mx-0";

  return (
    <div className="grid gap-8 pb-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-12 lg:pb-0 xl:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
      <div className="space-y-3">
        {product3dEligible ? (
          <Product3DViewer
            modelPath={product.modelPath}
            enabled
            mobileEnabled={visualEffects.mobileEnabled}
            respectReducedMotion={visualEffects.respectReducedMotion}
            animationStoreEnabled={animation.enabled}
            quality={visualEffects.quality}
            className={galleryShellClass}
            fallback={galleryFallback}
          />
        ) : (
          <div className={galleryShellClass}>{galleryFallback}</div>
        )}
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
                    className={`relative h-16 w-16 overflow-hidden rounded-[var(--radius-default,0.5rem)] border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
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
                      className="object-contain p-1"
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

      <div className="space-y-6">
        <div>
          <nav className="mb-3 text-xs text-[var(--color-muted)]" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/products" className="hover:text-[var(--color-foreground)]">
                  Products
                </Link>
              </li>
              {product.category ? (
                <>
                  <li aria-hidden>/</li>
                  <li>
                    <Link
                      href={`/categories/${product.category.slug}`}
                      className="hover:text-[var(--color-foreground)]"
                    >
                      {product.category.name}
                    </Link>
                  </li>
                </>
              ) : null}
            </ol>
          </nav>
          {product.category ? (
            <p className={sfEyebrow()}>{product.category.name}</p>
          ) : null}
          <h1 className={`mt-1 ${sfDisplay()} text-3xl md:text-4xl`}>
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
          <p className="text-[var(--color-muted)] leading-relaxed">
            {product.shortDescription}
          </p>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <p className="text-3xl font-semibold tabular-nums text-[var(--color-foreground)]">
            {formatMoney(selected.price, currency)}
          </p>
          {selected.compareAtPrice != null &&
          selected.compareAtPrice > selected.price ? (
            <>
              <p className="pb-1 text-sm tabular-nums text-[var(--color-muted)] line-through">
                {formatMoney(selected.compareAtPrice, currency)}
              </p>
              {discountPct != null ? (
                <span className="mb-1 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
                  −{discountPct}%
                </span>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip
            size="small"
            label={
              selected.stockStatus === "OUT_OF_STOCK"
                ? "Out of stock"
                : selected.stockStatus === "LOW_STOCK"
                  ? "Limited stock"
                  : "In stock"
            }
            color={stockColor[selected.stockStatus]}
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            {product.variants.length > 1 ? "Size / option" : "Selected option"}
          </legend>
          {product.variants.length > 1 ? (
            <div
              className="flex flex-wrap gap-2"
              role="listbox"
              aria-label="Choose product option"
            >
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
                    className={cn(
                      "min-h-11 rounded-[var(--radius-default,0.5rem)] border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                      active
                        ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))]"
                        : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]",
                      soldOut && "opacity-40",
                    )}
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
                  >
                    <span className="block">{variant.name}</span>
                    <span className="block text-xs font-normal text-[var(--color-muted)]">
                      {formatMoney(variant.price, currency)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">{selected.name}</p>
          )}
        </fieldset>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-card)_94%,transparent)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:pb-0 lg:backdrop-blur-none">
          <ProductPurchaseActions
            key={selected.id}
            productId={product.id}
            productSlug={product.slug}
            variantId={selected.id}
            maxAvailable={
              selected.stockStatus === "OUT_OF_STOCK" ? 0 : selected.available
            }
            outOfStock={selected.stockStatus === "OUT_OF_STOCK"}
            isAuthenticated={isAuthenticated}
          />
        </div>

        <DeliveryInfoBlock currency={currency} />

        {product.description ? (
          <section className="border-t border-[var(--color-border)] pt-6">
            <h2 className="font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-muted)]">
              {product.description}
            </p>
          </section>
        ) : null}
        {product.ingredients ? (
          <section>
            <h2 className="font-semibold">Specifications</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-muted)]">
              {product.ingredients}
            </p>
          </section>
        ) : null}
        {product.usageInstructions ? (
          <section>
            <h2 className="font-semibold">How to use</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-muted)]">
              {product.usageInstructions}
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
