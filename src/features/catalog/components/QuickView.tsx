"use client";

import CloseIcon from "@mui/icons-material/Close";
import Image from "next/image";
import Link from "next/link";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { addToCartAction } from "@/features/cart/actions";
import { QuantityStepper } from "@/features/cart/components/QuantityStepper";
import { cartQueryKey } from "@/features/cart/query-keys";
import { CART_MAX_QUANTITY } from "@/features/cart/types";
import { getProductQuickViewAction } from "@/features/catalog/quick-view-action";
import { formatMoney } from "@/features/catalog/money";
import type {
  StorefrontProductDetail,
  StorefrontProductImage,
} from "@/features/catalog/types";
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

const POPUP_WIDTH = 860;
const POPUP_HEIGHT = 560;
const IMAGE_COL_WIDTH = 300;

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
      maxWidth={false}
      scroll="paper"
      slotProps={{
        backdrop: {
          sx: { backgroundColor: "rgba(15, 15, 15, 0.55)" },
        },
        paper: {
          sx: {
            position: "relative",
            m: 2,
            width: `min(${POPUP_WIDTH}px, calc(100vw - 24px))`,
            height: `min(${POPUP_HEIGHT}px, calc(100vh - 48px))`,
            maxWidth: POPUP_WIDTH,
            maxHeight: POPUP_HEIGHT,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: "1.25rem",
            bgcolor: "var(--color-card)",
            color: "var(--color-foreground)",
          },
          "aria-label": "Quick view product",
        },
      }}
    >
      <IconButton
        type="button"
        onClick={onClose}
        aria-label="Close quick view"
        size="small"
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 40,
          bgcolor: "var(--color-card)",
          border: "1px solid var(--color-border)",
          color: "var(--color-foreground)",
          boxShadow: 1,
          "&:hover": { bgcolor: "var(--color-surface)" },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogContent
        sx={{
          p: "0 !important",
          flex: 1,
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {productQuery.isLoading ? (
          <Box
            aria-busy
            sx={{
              display: "flex",
              flexDirection: "row",
              height: "100%",
              minHeight: 0,
            }}
          >
            <Box
              sx={{
                width: IMAGE_COL_WIDTH,
                flexShrink: 0,
                borderRight: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor:
                  "color-mix(in srgb, var(--color-surface) 55%, white)",
              }}
            >
              <Box
                sx={{
                  width: 200,
                  height: 200,
                  borderRadius: 2,
                  bgcolor: "var(--color-surface)",
                }}
              />
            </Box>
            <Box sx={{ flex: 1, p: 3, pt: 6 }}>
              <Box
                sx={{
                  height: 16,
                  width: 96,
                  mb: 1.5,
                  borderRadius: 1,
                  bgcolor: "var(--color-surface)",
                }}
              />
              <Box
                sx={{
                  height: 28,
                  width: "70%",
                  mb: 1.5,
                  borderRadius: 1,
                  bgcolor: "var(--color-surface)",
                }}
              />
              <Box
                sx={{
                  height: 96,
                  width: "100%",
                  borderRadius: 1,
                  bgcolor: "var(--color-surface)",
                }}
              />
            </Box>
          </Box>
        ) : !product ? (
          <p className="p-8 pt-14 text-sm text-[var(--color-muted)]" role="status">
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

function pickGallery(
  images: StorefrontProductImage[],
  variantId: string | undefined,
): StorefrontProductImage[] {
  if (!images.length) return [];
  if (!variantId) return images;
  const forVariant = images.filter(
    (img) => img.variantId === variantId || img.variantId == null,
  );
  return forVariant.length > 0 ? forVariant : images;
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [buyPending, setBuyPending] = useState(false);

  const selected = useMemo(
    () =>
      product.variants.find((v) => v.id === variantId) ?? product.variants[0],
    [product.variants, variantId],
  );

  const gallery = useMemo(
    () => pickGallery(product.images, selected?.id),
    [product.images, selected?.id],
  );

  const [activeImageId, setActiveImageId] = useState<string | null>(
    () => gallery.find((img) => img.isPrimary)?.id ?? gallery[0]?.id ?? null,
  );

  useEffect(() => {
    const preferred =
      gallery.find((img) => img.variantId === selected?.id) ??
      gallery.find((img) => img.isPrimary) ??
      gallery[0];
    setActiveImageId(preferred?.id ?? null);
  }, [gallery, selected?.id]);

  const image =
    gallery.find((img) => img.id === activeImageId) ?? gallery[0] ?? null;

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

  async function buyItNow() {
    if (!selected) return;
    setError(null);
    setMessage(null);
    setBuyPending(true);
    try {
      const result = await addToCartAction({
        productId: product.id,
        variantId: selected.id,
        quantity,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      queryClient.setQueryData(cartQueryKey, result.cart);
      void queryClient.invalidateQueries({ queryKey: cartQueryKey });
      onClose();
      router.push("/checkout");
    } catch {
      setError("Could not start Buy it now.");
    } finally {
      setBuyPending(false);
    }
  }

  if (!selected) {
    return (
      <p className="p-8 pt-14 text-sm text-[var(--color-muted)]" role="status">
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
  const busy = addMutation.isPending || buyPending;
  const brand = product.brand?.trim() || product.category?.name || null;
  const description =
    product.description?.trim() || product.shortDescription?.trim() || null;
  const ingredients = product.ingredients?.trim() || null;
  const hasMultipleVariants = product.variants.length > 1;
  const optionLabel =
    selected.name?.trim() || selected.sku?.trim() || "Standard";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Left — fixed image column (never stacks) */}
      <Box
        component="aside"
        sx={{
          width: { xs: 200, sm: IMAGE_COL_WIDTH },
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          px: 2,
          py: 3,
          borderRight: "1px solid var(--color-border)",
          bgcolor: "color-mix(in srgb, var(--color-surface) 55%, white)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: { xs: 160, sm: 220 },
            height: { xs: 160, sm: 220 },
            flexShrink: 0,
            overflow: "hidden",
            borderRadius: 2,
            bgcolor: "#fff",
          }}
        >
          {image?.url ? (
            <Image
              src={image.url}
              alt={image.altText || product.name}
              width={220}
              height={220}
              className="h-full w-full object-contain p-2"
              sizes="220px"
              priority
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm text-[var(--color-muted)]">
              No image
            </span>
          )}
        </Box>

        {gallery.length > 1 ? (
          <ul className="flex max-w-[220px] gap-1.5 overflow-x-auto pb-0.5">
            {gallery.map((thumb) => {
              const active = thumb.id === image?.id;
              return (
                <li key={thumb.id} className="shrink-0">
                  <button
                    type="button"
                    aria-label={`Show image of ${product.name}`}
                    aria-pressed={active}
                    onClick={() => setActiveImageId(thumb.id)}
                    className={cn(
                      "relative h-11 w-11 overflow-hidden rounded-md border-2 bg-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                      active
                        ? "border-[var(--color-primary)]"
                        : "border-transparent hover:border-[var(--color-border)]",
                    )}
                  >
                    <Image
                      src={thumb.url}
                      alt=""
                      width={44}
                      height={44}
                      className="h-full w-full object-contain p-0.5"
                      sizes="44px"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Box>

      {/* Right — scrollable content */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
          px: { xs: 2, sm: 3 },
          py: 2.5,
          pt: 5,
        }}
      >
        <div className="space-y-4">
          {brand ? (
            <p className="text-sm italic text-[var(--color-muted)]">{brand}</p>
          ) : null}

          <div className="space-y-1.5">
            <h2 className="pr-8 font-[family-name:var(--font-display)] text-xl font-bold leading-tight tracking-tight text-[var(--color-foreground)] sm:text-2xl">
              {product.name}
            </h2>
            <p className="text-base font-medium tabular-nums text-[var(--color-foreground)] sm:text-lg">
              {formatMoney(selected.price, currency)}
              {selected.compareAtPrice != null &&
              selected.compareAtPrice > selected.price ? (
                <span className="ml-2 text-sm font-normal text-[var(--color-muted)] line-through">
                  {formatMoney(selected.compareAtPrice, currency)}
                </span>
              ) : null}
            </p>
          </div>

          {description ? (
            <section className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-foreground)]">
                Product description
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-muted)]">
                {description}
              </p>
            </section>
          ) : null}

          {ingredients ? (
            <section className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-foreground)]">
                Ingredients
              </h3>
              <IngredientList text={ingredients} />
            </section>
          ) : null}

          {product.usageInstructions?.trim() ? (
            <section className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-foreground)]">
                How to use
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-muted)]">
                {product.usageInstructions.trim()}
              </p>
            </section>
          ) : null}

          {hasMultipleVariants ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-[var(--color-foreground)]">
                Size
              </legend>
              <div
                className="flex flex-wrap gap-2"
                role="listbox"
                aria-label="Product options"
              >
                {product.variants.map((variant) => {
                  const active = variant.id === selected.id;
                  const soldOut = variant.stockStatus === "OUT_OF_STOCK";
                  const label =
                    variant.name?.trim() || variant.sku?.trim() || "Option";
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      disabled={soldOut}
                      onClick={() => setVariantId(variant.id)}
                      className={cn(
                        "min-h-10 rounded-md border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                        active
                          ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[var(--color-foreground)]"
                          : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]",
                        soldOut && "opacity-40",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-foreground)]">
                Option:{" "}
              </span>
              {optionLabel}
            </p>
          )}

          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              Quantity
            </p>
            <QuantityStepper
              id={`qv-qty-${product.id}`}
              value={quantity}
              max={maxQty}
              disabled={outOfStock}
              onChange={setQuantity}
            />
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              disabled={outOfStock || busy}
              onClick={() => {
                setError(null);
                setMessage(null);
                addMutation.mutate({
                  productId: product.id,
                  variantId: selected.id,
                  quantity,
                });
              }}
              className={cn(sfBtn("outline"), "w-full")}
            >
              {outOfStock
                ? "Out of stock"
                : addMutation.isPending
                  ? "Adding…"
                  : "Add to cart"}
            </button>
            <button
              type="button"
              disabled={outOfStock || busy}
              onClick={() => void buyItNow()}
              className={cn(sfBtn("primary"), "w-full")}
            >
              {buyPending ? "Starting…" : "Buy it now"}
            </button>
          </div>

          <p className="text-xs leading-relaxed text-[var(--color-muted)]">
            In case of natural calamities or government restrictions, delivery
            time may increase.
          </p>

          <Link
            href={`/products/${product.slug}`}
            onClick={onClose}
            className="inline-flex text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            View full details
          </Link>

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
      </Box>
    </Box>
  );
}

function IngredientList({ text }: { text: string }) {
  const items = text
    .split(/\n|•|;|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length <= 1) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-muted)]">
        {text}
      </p>
    );
  }

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-[var(--color-muted)]">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
