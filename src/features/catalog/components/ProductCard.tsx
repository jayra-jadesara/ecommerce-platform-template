"use client";

import Image from "next/image";
import Link from "next/link";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { addToCartAction } from "@/features/cart/actions";
import { cartQueryKey } from "@/features/cart/query-keys";
import { formatMoney } from "@/features/catalog/money";
import type { StorefrontProductCard } from "@/features/catalog/storefront";
import { QuickView } from "@/features/catalog/components/QuickView";
import { sfBtn } from "@/components/ui/storefront-classes";
import {
  getWishlistMembershipKeysAction,
  toggleWishlistAction,
} from "@/features/wishlist/actions";
import {
  wishlistMembershipKey,
  wishlistMembershipQueryKey,
  wishlistQueryKey,
} from "@/features/wishlist/query-keys";
import { cn } from "@/lib/cn";
import { useHasHydrated } from "@/lib/use-has-hydrated";

const EMPTY_VARIANT_OPTIONS: NonNullable<
  StorefrontProductCard["variantOptions"]
> = [];

interface ProductCardProps {
  product: StorefrontProductCard;
  currency: string;
  isAuthenticated?: boolean;
  /** Catalog list view uses a compact horizontal tile. */
  layout?: "grid" | "list";
  /** Tighter catalog tiles (smaller type, icons, CTA). */
  density?: "default" | "compact";
}

export function ProductCard({
  product,
  currency,
  isAuthenticated = false,
  layout = "grid",
  density = "default",
}: ProductCardProps) {
  const isList = layout === "list";
  const compact = density === "compact";
  const queryClient = useQueryClient();
  const hydrated = useHasHydrated();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);

  const variantOptions = product.variantOptions ?? EMPTY_VARIANT_OPTIONS;
  const defaultVariantId =
    product.defaultVariantId ?? variantOptions[0]?.id ?? null;

  const [productScope, setProductScope] = useState(product.id);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    defaultVariantId,
  );
  const [activeImage, setActiveImage] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());

  if (productScope !== product.id) {
    setProductScope(product.id);
    setSelectedVariantId(
      product.defaultVariantId ??
        (product.variantOptions?.[0]?.id ?? null),
    );
    setActiveImage(0);
    setFailedUrls(new Set());
  }

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
        queryKey: wishlistMembershipQueryKey,
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

  const inWishlist =
    hydrated &&
    isAuthenticated &&
    Boolean(wishlistVariantId) &&
    membershipSet.has(
      wishlistMembershipKey(product.id, wishlistVariantId),
    );

  const gallery = useMemo(() => {
    const fromField = product.imageUrls?.filter(Boolean) ?? [];
    if (fromField.length > 0) return fromField.slice(0, 3);
    return [product.primaryImageUrl, product.secondaryImageUrl].filter(
      (url): url is string => Boolean(url),
    );
  }, [product.imageUrls, product.primaryImageUrl, product.secondaryImageUrl]);

  const visibleGallery = useMemo(
    () => gallery.filter((url) => !failedUrls.has(url)),
    [gallery, failedUrls],
  );

  const safeActive =
    visibleGallery.length === 0
      ? 0
      : Math.min(activeImage, visibleGallery.length - 1);

  const showSegments = visibleGallery.length > 1;

  const activeUrl = visibleGallery[safeActive] ?? null;

  // Prefetch the next gallery URL without mounting extra Next/Image optimizers.
  useEffect(() => {
    if (typeof window === "undefined" || visibleGallery.length < 2) return;
    const nextIndex = (safeActive + 1) % visibleGallery.length;
    const nextUrl = visibleGallery[nextIndex];
    if (!nextUrl) return;
    const img = new window.Image();
    img.src = nextUrl;
  }, [safeActive, visibleGallery]);

  const iconBtn =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";
  const iconSize = "!text-[0.95rem]";
  const ctaClass = cn(
    sfBtn("primary"),
    "w-full !min-h-8 !rounded-[var(--radius-default,0.5rem)] !px-2 !py-1.5 !text-[11px] !shadow-none",
  );

  function markFailed(url: string) {
    setFailedUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }

  const listThumbUrl = activeUrl;
  const primaryIconBtn =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-button-foreground)] shadow-sm transition-[filter,transform] hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-safe:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";

  function addToCart() {
    if (!selectedOption) return;
    setError(null);
    setMessage(null);
    addMutation.mutate({
      productId: product.id,
      variantId: selectedOption.id,
      quantity: 1,
    });
  }

  const wishlistControl = wishlistVariantId ? (
    isAuthenticated ? (
      <button
        type="button"
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={inWishlist}
        disabled={wishlistMutation.isPending}
        onClick={() => wishlistMutation.mutate()}
        className={iconBtn}
      >
        {inWishlist ? (
          <FavoriteIcon
            fontSize="inherit"
            className={cn(iconSize, "!text-[var(--color-primary)]")}
          />
        ) : (
          <FavoriteBorderIcon fontSize="inherit" className={iconSize} />
        )}
      </button>
    ) : (
      <Link
        href={`/login?next=${encodeURIComponent(`/products/${product.slug}`)}`}
        aria-label="Sign in to add to wishlist"
        className={iconBtn}
      >
        <FavoriteBorderIcon fontSize="inherit" className={iconSize} />
      </Link>
    )
  ) : null;

  return (
    <article
      className={cn(
        "group relative z-0 h-full w-full min-w-0 sf-product-tile",
        isList ? "flex flex-row items-start gap-3 p-3 sm:gap-4 sm:p-4" : "flex flex-col",
      )}
    >
      {isList ? (
        <Link
          href={`/products/${product.slug}`}
          aria-label={product.name}
          className="relative block shrink-0 overflow-hidden rounded-[calc(var(--radius-default,0.75rem)-2px)] bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          style={{ width: 112, height: 112 }}
        >
          {listThumbUrl ? (
            <Image
              src={listThumbUrl}
              alt={product.primaryImageAlt || product.name}
              width={112}
              height={112}
              className="h-full w-full object-contain p-1.5"
              loading="lazy"
              unoptimized
              onError={() => markFailed(listThumbUrl)}
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-lg font-semibold text-[var(--color-muted)]"
              aria-hidden
            >
              {product.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </Link>
      ) : (
      <div
        className="group relative aspect-[4/5] w-full overflow-hidden sf-product-tile-media bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))]"
        onMouseLeave={() => setActiveImage(0)}
      >
        {activeUrl ? (
          <Image
            key={`${product.id}-${activeUrl}`}
            src={activeUrl}
            alt={product.primaryImageAlt || product.name}
            fill
            sizes="(max-width: 640px) 42vw, (max-width: 1024px) 22vw, 200px"
            className={cn(
              "sf-product-tile-image object-contain",
              compact ? "p-1.5" : "p-2 sm:p-2.5",
            )}
            loading="lazy"
            unoptimized
            onError={() => markFailed(activeUrl)}
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--color-primary)_22%,transparent),transparent_55%)] text-sm font-medium text-[var(--color-muted)]"
            role="img"
            aria-label={`${product.name} placeholder`}
          >
            {product.name.slice(0, 1).toUpperCase()}
          </span>
        )}

        {showSegments ? (
          <>
            <div className="absolute inset-0 z-[2] flex">
              {visibleGallery.map((_, index) => (
                <Link
                  key={`zone-${index}`}
                  href={`/products/${product.slug}`}
                  className="flex-1"
                  onMouseEnter={() => setActiveImage(index)}
                  tabIndex={index === 0 ? 0 : -1}
                  aria-label={index === 0 ? product.name : undefined}
                  aria-hidden={index !== 0}
                />
              ))}
            </div>
            <div
              className="sf-product-tile-segments"
              aria-hidden
              style={{
                position: "absolute",
                top: 8,
                left: 16,
                right: 16,
                zIndex: 25,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                pointerEvents: "none",
              }}
            >
              {visibleGallery.map((_, index) => {
                const active = index === safeActive;
                return (
                  <span
                    key={`seg-${index}`}
                    data-active={active ? "true" : "false"}
                    style={{
                      display: "block",
                      height: 5,
                      width: 40,
                      flex: "0 0 auto",
                      borderRadius: 9999,
                      backgroundColor: active
                        ? "var(--color-primary)"
                        : "color-mix(in srgb, var(--color-primary) 22%, white)",
                      boxShadow: active
                        ? "0 1px 3px color-mix(in srgb, var(--color-primary) 45%, transparent)"
                        : "0 0 0 1px color-mix(in srgb, var(--color-primary) 28%, transparent)",
                      transition: "background-color 150ms ease, box-shadow 150ms ease",
                    }}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <Link
            href={`/products/${product.slug}`}
            aria-label={product.name}
            className="absolute inset-0 z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          />
        )}

        <div className="sf-product-tile-badges">
          {discountPct != null && discountPct > 0 ? (
            <span className="rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[8px] font-semibold text-[var(--color-button-foreground)]">
              −{discountPct}%
            </span>
          ) : null}
          {product.stockStatus === "OUT_OF_STOCK" ? (
            <span className="rounded-full bg-[var(--color-card)]/95 px-1.5 py-0.5 text-[8px] font-semibold text-[var(--color-muted)] shadow-sm">
              Sold out
            </span>
          ) : null}
        </div>

        <div
          className="sf-product-tile-actions"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            left: "auto",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          {wishlistControl}
          <button
            type="button"
            aria-label={`Quick view ${product.name}`}
            onClick={() => setQuickOpen(true)}
            className={primaryIconBtn}
          >
            <SearchIcon fontSize="inherit" className={iconSize} />
          </button>
        </div>
      </div>
      )}

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col border-0",
          isList
            ? "items-start gap-1 py-0.5 text-left"
            : "items-center gap-0.5 p-2 text-center sm:p-2.5",
        )}
      >
        {isList ? (
          <>
            <div className="flex w-full items-start justify-between gap-3">
              <Link
                href={`/products/${product.slug}`}
                className="min-w-0 flex-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              >
                <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[var(--color-foreground)] sm:text-lg">
                  {product.name}
                </h3>
              </Link>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  aria-label={
                    product.stockStatus === "OUT_OF_STOCK" ||
                    !selectedOption?.available
                      ? `${product.name} out of stock`
                      : `Add ${product.name} to cart`
                  }
                  disabled={!canAdd || addMutation.isPending || !selectedOption}
                  onClick={addToCart}
                  className={primaryIconBtn}
                >
                  <ShoppingCartOutlinedIcon
                    fontSize="inherit"
                    className={iconSize}
                  />
                </button>
                <button
                  type="button"
                  aria-label={`Quick view ${product.name}`}
                  onClick={() => setQuickOpen(true)}
                  className={iconBtn}
                >
                  <SearchIcon fontSize="inherit" className={iconSize} />
                </button>
                {wishlistControl}
              </div>
            </div>
            <p className="text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
              {priceLabel}
            </p>
            <div className="mt-1 w-full">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-foreground)]">
                Product description
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--color-muted)] sm:text-sm">
                {product.shortDescription?.trim() ||
                  `Explore ${product.name} and available pack options.`}
              </p>
            </div>
            {message ? (
              <p className="text-[10px] text-[var(--color-success)]" role="status">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="text-[10px] text-[var(--color-error)]" role="alert">
                {error}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <Link
              href={`/products/${product.slug}`}
              className="w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              {product.categoryName ? (
                <p className="text-[9px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                  {product.categoryName}
                </p>
              ) : null}
              <h3 className="mt-0.5 line-clamp-2 min-h-[2.4em] text-xs font-semibold leading-snug text-[var(--color-foreground)] sm:text-sm">
                {product.name}
              </h3>
            </Link>

            <div
              className="mt-1 flex h-6 w-full flex-wrap content-center items-center justify-center gap-1 overflow-hidden"
              role={hasVariants ? "listbox" : undefined}
              aria-label={hasVariants ? `${product.name} options` : undefined}
              aria-hidden={!hasVariants}
            >
              {hasVariants
                ? variantOptions.slice(0, 3).map((opt) => {
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
                          "rounded border px-1.5 py-0.5 text-[9px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)]",
                          active
                            ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[var(--color-primary)]"
                            : "border-[var(--color-border)] text-[var(--color-muted)]",
                          !opt.available && "opacity-40",
                        )}
                      >
                        {opt.name}
                      </button>
                    );
                  })
                : (
                  <span className="invisible text-[9px]" aria-hidden>
                    —
                  </span>
                )}
            </div>

            <div className="mt-1 flex flex-wrap items-baseline justify-center gap-1">
              <p className="text-xs font-semibold tabular-nums text-[var(--color-foreground)]">
                {priceLabel}
              </p>
              {displayCompare != null &&
              displayPrice != null &&
              displayCompare > displayPrice ? (
                <p className="text-[9px] tabular-nums text-[var(--color-muted)] line-through">
                  {formatMoney(displayCompare, currency)}
                </p>
              ) : null}
            </div>

            <div className="mt-auto w-full pt-2">
              {hasVariants && !selectedOption ? (
                <Link href={`/products/${product.slug}`} className={ctaClass}>
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
                  className={ctaClass}
                >
                  {product.stockStatus === "OUT_OF_STOCK" ||
                  !selectedOption?.available
                    ? "Out of stock"
                    : addMutation.isPending
                      ? "Adding…"
                      : "Add to cart"}
                </button>
              )}
              {message ? (
                <p
                  className="mt-1 text-[10px] text-[var(--color-success)]"
                  role="status"
                >
                  {message}
                </p>
              ) : null}
              {error ? (
                <p
                  className="mt-1 text-[10px] text-[var(--color-error)]"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
            </div>
          </>
        )}
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
