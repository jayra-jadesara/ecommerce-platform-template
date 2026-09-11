"use client";

import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";
import {
  clearCartAction,
  getCartAction,
  removeFromCartAction,
  updateCartItemQuantityAction,
} from "@/features/cart/actions";
import { FreeShippingProgressLoader } from "@/features/cart/components/FreeShippingProgressLoader";
import { QuantityStepper } from "@/features/cart/components/QuantityStepper";
import { cartQueryKey } from "@/features/cart/query-keys";
import { CART_MAX_QUANTITY, type CartView } from "@/features/cart/types";
import { formatMoney } from "@/features/catalog/money";
import { EmptyState, emptyStateCtaClass } from "@/components/ui/EmptyState";

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

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: cartQueryKey });

  const updateMutation = useMutation({
    mutationFn: updateCartItemQuantityAction,
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      queryClient.setQueryData(cartQueryKey, result.cart);
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
      queryClient.setQueryData(cartQueryKey, result.cart);
    },
  });

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
    <div className="grid gap-8 pb-24 lg:grid-cols-[1fr_320px] lg:pb-0">
      <div className="space-y-4">
        {error ? (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <ul className="space-y-4" aria-label="Cart items">
          {cart.items.map((item) => {
            const unavailable = item.availability !== "AVAILABLE";
            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-start"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-[var(--color-muted)]">
                      No image
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    {item.productSlug ? (
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                      >
                        {item.productName}
                      </Link>
                    ) : (
                      <p className="font-medium">{item.productName}</p>
                    )}
                    <p className="text-sm text-[var(--color-muted)]">
                      {item.variantName}
                    </p>
                    {unavailable ? (
                      <p className="mt-1 text-sm font-medium text-red-700">
                        {item.availability === "OUT_OF_STOCK"
                          ? "Out of stock"
                          : "Unavailable"}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
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
                      className="text-sm text-[var(--color-muted)] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                      disabled={removeMutation.isPending}
                      onClick={() =>
                        removeMutation.mutate({ cartItemId: item.id })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="text-sm sm:text-right">
                  <p className="text-[var(--color-muted)]">
                    {formatMoney(item.unitPrice, cart.currency)} each
                  </p>
                  <p className="font-semibold">
                    {formatMoney(item.lineTotal, cart.currency)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="text-sm text-[var(--color-muted)] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await clearCartAction();
              if (result.ok) {
                queryClient.setQueryData(cartQueryKey, result.cart);
              } else {
                setError(result.error);
              }
              await invalidate();
            });
          }}
        >
          Clear cart
        </button>
      </div>

      <aside className="h-fit rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 lg:sticky lg:top-4">
        <h2 className="font-semibold">Order summary</h2>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Subtotal only — shipping, tax, and payment fees are calculated when
          you Buy it now.
        </p>
        <div className="mt-4">
          <FreeShippingProgressLoader
            subtotalMajor={cart.subtotal}
            currency={cart.currency}
          />
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Items</dt>
            <dd>{cart.itemCount}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Subtotal</dt>
            <dd>{formatMoney(cart.subtotal, cart.currency)}</dd>
          </div>
        </dl>

        <div className="mt-6 hidden space-y-2 lg:block">
          {cart.items.length === 0 || checkoutDisabled ? (
            <button
              type="button"
              disabled
              title={
                cart.items.length === 0
                  ? "Your cart is empty"
                  : "Remove unavailable items before Buy it now"
              }
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

      {/* Mobile sticky Buy it now CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-card)_94%,transparent)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--color-muted)]">Subtotal</p>
            <p className="truncate text-base font-semibold">
              {formatMoney(cart.subtotal, cart.currency)}
            </p>
          </div>
          {cart.items.length === 0 || checkoutDisabled ? (
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
