"use client";

import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import ViewAgendaOutlinedIcon from "@mui/icons-material/ViewAgendaOutlined";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useTransition } from "react";
import {
  clearCartAction,
  getCartAction,
  removeFromCartAction,
  updateCartItemQuantityAction,
} from "@/features/cart/actions";
import { FreeShippingProgressLoader } from "@/features/cart/components/FreeShippingProgressLoader";
import { QuantityStepper } from "@/features/cart/components/QuantityStepper";
import { cartQueryKey } from "@/features/cart/query-keys";
import {
  invalidateCartQueryCaches,
  syncCartQueryCaches,
} from "@/features/cart/sync-cart-query";
import { getFreeShippingHintAction } from "@/features/cart/shipping-hint";
import {
  CART_MAX_QUANTITY,
  cartCountLabel,
  type CartView,
} from "@/features/cart/types";
import { formatMoney } from "@/features/catalog/money";
import { EmptyState, emptyStateCtaClass } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

interface CartPageClientProps {
  initialCart: CartView;
}

export function CartPageClient({ initialCart }: CartPageClientProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { data: cart = initialCart } = useQuery({
    queryKey: cartQueryKey,
    queryFn: () => getCartAction(),
    initialData: initialCart,
    staleTime: 30_000,
  });

  const shippingHint = useQuery({
    queryKey: ["free-shipping-hint"],
    queryFn: () => getFreeShippingHintAction(),
    staleTime: 5 * 60_000,
  });

  const invalidate = () => invalidateCartQueryCaches(queryClient);

  const updateMutation = useMutation({
    mutationFn: updateCartItemQuantityAction,
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      syncCartQueryCaches(queryClient, result.cart);
    },
    onError: () => setError("Could not update quantity."),
  });

  const removeMutation = useMutation({
    mutationFn: removeFromCartAction,
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      syncCartQueryCaches(queryClient, result.cart);
    },
  });

  function clearCart() {
    startTransition(async () => {
      const result = await clearCartAction();
      if (result.ok) {
        syncCartQueryCaches(queryClient, result.cart);
      } else {
        setError(result.error);
      }
      await invalidate();
    });
  }

  const lineCount = cart.lineCount ?? cart.items.length;
  const countLabel = cartCountLabel({
    itemCount: cart.itemCount,
    lineCount,
  });

  const deliveryLabel = useMemo(() => {
    const hint = shippingHint.data;
    if (!hint?.enabled) return "Calculated at checkout";
    if (hint.thresholdMajor == null) return "Calculated at checkout";
    if (cart.subtotal >= hint.thresholdMajor) return "Free";
    return "Calculated at checkout";
  }, [shippingHint.data, cart.subtotal]);

  if (cart.items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Browse the catalog and add items when you are ready."
        action={
          <Link href="/products" className={emptyStateCtaClass("primary")}>
            Continue shopping
          </Link>
        }
      />
    );
  }

  const checkoutDisabled = cart.hasUnavailableItems;

  return (
    <div className="grid gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:gap-8 lg:pb-0">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
              <ShoppingCartOutlinedIcon className="!text-base" aria-hidden />
            </span>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-foreground)]">
              <Inventory2OutlinedIcon
                className="!text-sm text-[var(--color-primary)]"
                aria-hidden
              />
              {countLabel}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            disabled={pending}
            onClick={clearCart}
          >
            <DeleteOutlinedIcon className="!text-base" aria-hidden />
            Clear cart
          </button>
        </div>

        {error ? (
          <p
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <ul className="space-y-2" aria-label="Cart items">
          {cart.items.map((item) => {
            const unavailable = item.availability !== "AVAILABLE";
            return (
              <li
                key={item.id}
                className="rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] p-2.5"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] sm:h-16 sm:w-16">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.imageAlt}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-[var(--color-muted)]">
                        —
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {item.productSlug ? (
                          <Link
                            href={`/products/${item.productSlug}`}
                            className="block truncate text-sm font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                          >
                            {item.productName}
                          </Link>
                        ) : (
                          <p className="truncate text-sm font-medium">
                            {item.productName}
                          </p>
                        )}
                        <p className="truncate text-xs text-[var(--color-muted)]">
                          {item.variantName}
                          <span className="text-[var(--color-muted)]">
                            {" "}
                            · {formatMoney(item.unitPrice, cart.currency)} ×{" "}
                            {item.quantity}
                          </span>
                        </p>
                        {unavailable ? (
                          <p className="mt-0.5 text-xs font-medium text-red-700">
                            {item.availability === "OUT_OF_STOCK"
                              ? "Out of stock"
                              : "Unavailable"}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatMoney(item.lineTotal, cart.currency)}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5">
                      <QuantityStepper
                        id={`qty-${item.id}`}
                        value={item.quantity}
                        max={Math.min(
                          CART_MAX_QUANTITY,
                          item.availableStock ?? CART_MAX_QUANTITY,
                        )}
                        disabled={unavailable || updateMutation.isPending}
                        onChange={(quantity) => {
                          setError(null);
                          updateMutation.mutate({
                            cartItemId: item.id,
                            quantity,
                          });
                        }}
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${item.productName} from cart`}
                        title="Remove"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-error)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-40"
                        disabled={removeMutation.isPending}
                        onClick={() =>
                          removeMutation.mutate({ cartItemId: item.id })
                        }
                      >
                        <DeleteOutlinedIcon className="!text-[1.15rem]" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="h-fit rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 lg:sticky lg:top-4 lg:p-5">
        <h2 className="font-semibold">Order summary</h2>
        <div className="mt-3">
          <FreeShippingProgressLoader
            subtotalMajor={cart.subtotal}
            currency={cart.currency}
          />
        </div>

        <ul
          className={cn(
            "mt-3 space-y-1.5 border-b border-[var(--color-border)] pb-3 text-xs text-[var(--color-muted)]",
            cart.items.length > 8 && "max-h-56 overflow-y-auto pr-1",
          )}
        >
          {cart.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span className="min-w-0 truncate">
                {item.productName}
                {item.variantName ? ` · ${item.variantName}` : ""} ×{" "}
                {item.quantity}
              </span>
              <span className="shrink-0 tabular-nums text-[var(--color-foreground)]">
                {formatMoney(item.lineTotal, cart.currency)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="flex items-center gap-1 text-[var(--color-muted)]">
              <ViewAgendaOutlinedIcon className="!text-base" aria-hidden />
              Lines
            </dt>
            <dd className="font-medium tabular-nums">{lineCount}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="flex items-center gap-1 text-[var(--color-muted)]">
              <Inventory2OutlinedIcon className="!text-base" aria-hidden />
              Packages
            </dt>
            <dd className="font-medium tabular-nums">{cart.itemCount}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="flex items-center gap-1 text-[var(--color-muted)]">
              <LocalShippingOutlinedIcon className="!text-base" aria-hidden />
              Delivery
            </dt>
            <dd
              className={cn(
                "font-medium",
                deliveryLabel === "Free" && "text-[var(--color-success)]",
              )}
            >
              {deliveryLabel}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-[var(--color-border)] pt-3 text-base font-semibold">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">
              {formatMoney(cart.subtotal, cart.currency)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Tax and payment fees are calculated when you Buy it now.
        </p>

        <div className="mt-5 hidden space-y-2 lg:block">
          {checkoutDisabled ? (
            <button
              type="button"
              disabled
              title="Remove unavailable items before Buy it now"
              className="flex min-h-11 w-full items-center justify-center rounded-md bg-[var(--color-button-background)] px-4 py-2.5 text-sm font-medium text-[var(--color-button-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Buy it now
            </button>
          ) : (
            <Link
              href="/checkout"
              className="flex min-h-11 w-full items-center justify-center rounded-md bg-[var(--color-button-background)] px-4 py-2.5 text-sm font-medium text-[var(--color-button-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              Buy it now
            </Link>
          )}
          <Link
            href="/products"
            className="flex min-h-11 w-full items-center justify-center rounded-md border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Continue shopping
          </Link>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-card)_94%,transparent)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--color-muted)]">{countLabel}</p>
            <p className="truncate text-base font-semibold tabular-nums">
              {formatMoney(cart.subtotal, cart.currency)}
            </p>
          </div>
          {checkoutDisabled ? (
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-[var(--color-button-background)] px-4 text-sm font-medium text-[var(--color-button-foreground)] disabled:opacity-50"
            >
              Buy it now
            </button>
          ) : (
            <Link
              href="/checkout"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-[var(--color-button-background)] px-4 text-sm font-medium text-[var(--color-button-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              Buy it now
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
