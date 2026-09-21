"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useId, useMemo, useState, type ReactNode } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import SpaOutlinedIcon from "@mui/icons-material/SpaOutlined";
import SubjectOutlinedIcon from "@mui/icons-material/SubjectOutlined";
import Chip from "@mui/material/Chip";
import { ProductPurchaseActions } from "@/features/cart/components/ProductPurchaseActions";
import { DeliveryInfoBlock } from "@/features/catalog/components/DeliveryInfoBlock";
import { ProductImageZoom } from "@/features/catalog/components/ProductImageZoom";
import { ProductWishlistButton } from "@/features/catalog/components/ProductWishlistButton";
import { formatMoney } from "@/features/catalog/money";
import type { StorefrontProductDetail } from "@/features/catalog/types";
import type {
  SocialLinksConfig,
  VisualEffectsConfig,
  AnimationConfig,
} from "@/types";
import { ShareActions } from "@/components/ui/ShareActions";
import { sfDisplay, sfEyebrow } from "@/components/ui/storefront-classes";
import { returnPolicyLabel } from "@/features/shipping/policies";
import { StarRating } from "@/features/reviews/components/StarRating";
import { cn } from "@/lib/cn";
import { resolve3DConfig } from "@/features/motion-3d";

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
  shareUrl: string;
  social?: SocialLinksConfig;
  /** When false, hide rating row on the PDP. */
  reviewsEnabled?: boolean;
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
  shareUrl,
  social,
  reviewsEnabled = true,
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

  const galleryFallback = activeImage ? (
    <ProductImageZoom
      key={activeImage.id}
      src={activeImage.url}
      alt={activeImage.altText || product.name}
      zoom={2.2}
      lensSize={200}
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
      <span className="text-sm text-[var(--color-muted)]">No product image</span>
    </div>
  );

  const product3dEligible = resolve3DConfig({
    global: visualEffects,
    animationEnabled: animation.enabled,
    isMobile: false,
    reducedMotion: false,
    webglAvailable: true,
    hasTrustedModel: Boolean(product.modelPath),
  }).mayMountProduct3d;

  const galleryShellClass =
    "sf-pdp-media relative overflow-hidden rounded-[var(--radius-default,0.5rem)] bg-[color-mix(in_srgb,var(--color-primary)_4%,var(--color-background))]";

  const thumbs =
    galleryImages.length > 1 ? (
      <ul className="sf-pdp-thumbs" aria-label="Product gallery">
        {galleryImages.map((image) => {
          const active = image.id === activeImage?.id;
          return (
            <li key={image.id} className="shrink-0 sm:w-full">
              <button
                type="button"
                aria-label={`Show ${image.altText || "product image"}`}
                aria-pressed={active}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-[var(--radius-default,0.4rem)] border bg-[color-mix(in_srgb,var(--color-primary)_4%,var(--color-background))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] max-sm:h-14 max-sm:w-14",
                  active
                    ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]"
                    : "border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] hover:border-[color-mix(in_srgb,var(--color-primary)_40%,transparent)]",
                )}
                onClick={() => setActiveImageId(image.id)}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  className="object-contain p-0.5"
                  sizes="72px"
                  loading="lazy"
                />
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div className="sf-pdp-layout pb-28 lg:pb-0">
      <div className="sf-pdp-gallery">
        {thumbs}
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
      </div>

      <div className="sf-pdp-info space-y-4 md:space-y-5">
        <div className="space-y-2.5">
          {product.category ? (
            <p className={sfEyebrow()}>{product.category.name}</p>
          ) : null}
          <div className="flex items-start justify-between gap-3">
            <h1
              className={`${sfDisplay()} min-w-0 flex-1 text-[1.65rem] leading-[1.15] tracking-tight md:text-[2rem]`}
            >
              {product.name}
            </h1>
            <ProductWishlistButton
              productId={product.id}
              productSlug={product.slug}
              variantId={selected.id}
              isAuthenticated={isAuthenticated}
              className="mt-0.5 shrink-0 !bg-transparent !shadow-none"
            />
          </div>
          {selected.name ? (
            <p className="text-sm text-[var(--color-muted)]">
              Net weight:{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                {selected.name}
              </span>
            </p>
          ) : null}
          {product.shortDescription ? (
            <p className="max-w-prose text-sm leading-relaxed text-[var(--color-muted)]">
              {product.shortDescription}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {reviewsEnabled ? (
              <>
                <StarRating
                  value={product.ratingCount > 0 ? product.ratingAvg : 0}
                  size="md"
                />
                <span className="text-sm tabular-nums text-[var(--color-muted)]">
                  {product.ratingCount > 0
                    ? `(${product.ratingCount}) ${product.ratingAvg.toFixed(1)} Rating`
                    : "(0) 0 Rating"}
                </span>
              </>
            ) : null}
          </div>
          {product.brand ? (
            <p className="text-xs text-[var(--color-muted)]">{product.brand}</p>
          ) : null}
          <ShareActions
            url={shareUrl}
            title={product.name}
            label="Share"
            profiles={{
              instagram: social?.instagram,
              youtube: social?.youtube,
            }}
            className="pt-1"
          />
        </div>

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
            layout="rail"
            showWishlist={false}
            leading={
              <>
                {product.variants.length > 1 ? (
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-[var(--color-foreground)]">
                      Size / option
                    </legend>
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
                              "min-h-10 rounded-[var(--radius-default,0.45rem)] border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                              active
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                                : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]",
                              soldOut && "opacity-40",
                            )}
                            onClick={() => {
                              setVariantId(variant.id);
                              const nextImages = product.images.filter(
                                (image) =>
                                  image.variantId === variant.id ||
                                  !image.variantId,
                              );
                              const preferred =
                                nextImages.find(
                                  (image) => image.variantId === variant.id,
                                ) ??
                                nextImages.find((image) => image.isPrimary) ??
                                nextImages[0];
                              if (preferred) setActiveImageId(preferred.id);
                            }}
                          >
                            {variant.name}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}

                <div className="space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--color-foreground)] md:text-[1.75rem]">
                      {formatMoney(selected.price, currency)}
                    </span>
                    {selected.compareAtPrice != null &&
                    selected.compareAtPrice > selected.price ? (
                      <>
                        <span className="text-sm tabular-nums text-[var(--color-muted)] line-through">
                          {formatMoney(selected.compareAtPrice, currency)}
                        </span>
                        {discountPct != null ? (
                          <span className="text-xs font-semibold text-[var(--color-primary)]">
                            -{discountPct}%
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">
                    Inclusive of all taxes
                  </p>
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
                  {product.featured ? (
                    <Chip size="small" label="Featured" color="primary" />
                  ) : null}
                  <Chip
                    size="small"
                    label={returnPolicyLabel(product.returnPolicy)}
                    variant="outlined"
                  />
                </div>
              </>
            }
          />
        </div>

        <DeliveryInfoBlock currency={currency} />

        <div className="border-t border-[var(--color-border)]">
          {product.description ? (
            <ProductDetailDisclosure
              title="Description"
              icon={<SubjectOutlinedIcon sx={{ fontSize: 18 }} aria-hidden />}
            >
              {product.description}
            </ProductDetailDisclosure>
          ) : null}
          {product.usageInstructions ? (
            <ProductDetailDisclosure
              title="How to use"
              icon={<MenuBookOutlinedIcon sx={{ fontSize: 18 }} aria-hidden />}
            >
              {product.usageInstructions}
            </ProductDetailDisclosure>
          ) : null}
          {product.ingredients ? (
            <ProductDetailDisclosure
              title="Ingredients"
              icon={<SpaOutlinedIcon sx={{ fontSize: 18 }} aria-hidden />}
            >
              {product.ingredients}
            </ProductDetailDisclosure>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProductDetailDisclosure({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: string;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(true);

  return (
    <section className="border-b border-[var(--color-border)]">
      <h2>
        <button
          type="button"
          className="flex w-full items-center gap-2 py-3 text-left text-sm font-semibold text-[var(--color-foreground)]"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="text-[var(--color-primary)]">{icon}</span>
          <span className="min-w-0 flex-1">{title}</span>
          <ExpandMoreIcon
            sx={{ fontSize: 20 }}
            aria-hidden
            className={cn(
              "text-[var(--color-muted)] transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </h2>
      {open ? (
        <p
          id={panelId}
          className="max-w-prose whitespace-pre-wrap pb-3 text-sm leading-relaxed text-[var(--color-muted)]"
        >
          {children}
        </p>
      ) : null}
    </section>
  );
}
