"use client";

import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import { useState } from "react";
import {
  getCartAction,
  removeFromCartAction,
  updateCartItemQuantityAction,
} from "@/features/cart/actions";
import { cartQueryKey } from "@/features/cart/query-keys";
import { emptyCartView } from "@/features/cart/types";
import { FreeShippingProgressLoader } from "@/features/cart/components/FreeShippingProgressLoader";
import { formatMoney } from "@/features/catalog/money";
import { EmptyState, emptyStateCtaClass } from "@/components/ui/EmptyState";
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

export function HeaderCartControl() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: cart = emptyCartView() } = useQuery({
    queryKey: cartQueryKey,
    queryFn: () => getCartAction(),
    staleTime: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: removeFromCartAction,
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(cartQueryKey, result.cart);
      }
    },
  });

  const qtyMutation = useMutation({
    mutationFn: updateCartItemQuantityAction,
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(cartQueryKey, result.cart);
      }
    },
  });

  return (
    <>
      <IconButton
        aria-label={`Open cart, ${cart.itemCount} items`}
        size="medium"
        onClick={() => setOpen(true)}
        className="!text-[var(--color-header-foreground)]"
      >
        <span className="relative inline-flex">
          <ShoppingCartOutlinedIcon fontSize="small" />
          {cart.itemCount > 0 ? (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-semibold text-[var(--color-button-foreground)]">
              {cart.itemCount > 99 ? "99+" : cart.itemCount}
            </span>
          ) : null}
        </span>
      </IconButton>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            className:
              "!bg-[var(--color-card)] !text-[var(--color-foreground)] w-full max-w-md",
            "aria-label": "Shopping cart",
          },
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                Your cart
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close cart"
              className="rounded-md px-2 py-1 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {cart.items.length === 0 ? (
              <EmptyState
                title="Your cart is empty"
                description="Browse the catalog and add something you love."
                className="!border-0 !bg-transparent !px-0 !py-8 !shadow-none"
                action={
                  <Link
                    href="/products"
                    onClick={() => setOpen(false)}
                    className={emptyStateCtaClass("primary")}
                  >
                    Continue shopping
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-4" aria-label="Cart items">
                {cart.items.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[var(--radius-default,0.5rem)] border border-[var(--color-border)] bg-[var(--color-surface)]">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.imageAlt}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {item.productName}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {item.variantName}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`cart-qty-${item.id}`}>
                          Quantity for {item.productName}
                        </label>
                        <select
                          id={`cart-qty-${item.id}`}
                          className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-xs"
                          value={item.quantity}
                          disabled={qtyMutation.isPending}
                          onChange={(event) => {
                            qtyMutation.mutate({
                              cartItemId: item.id,
                              quantity: Number(event.target.value),
                            });
                          }}
                        >
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        <p className="text-sm font-semibold tabular-nums">
                          {formatMoney(item.lineTotal, cart.currency)}
                        </p>
                        <button
                          type="button"
                          className="ml-auto text-xs text-[var(--color-muted)] underline hover:text-[var(--color-foreground)]"
                          disabled={removeMutation.isPending}
                          onClick={() =>
                            removeMutation.mutate({ cartItemId: item.id })
                          }
                        >
                          Remove
                        </button>
                      </div>
                      {item.availability !== "AVAILABLE" ? (
                        <p className="mt-1 text-xs text-[var(--color-error)]">
                          Unavailable
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 border-t border-[var(--color-border)] px-5 py-4">
            {cart.items.length > 0 ? (
              <FreeShippingProgressLoader
                subtotalMajor={cart.subtotal}
                currency={cart.currency}
              />
            ) : null}
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-muted)]">Subtotal</span>
              <span className="font-semibold tabular-nums">
                {formatMoney(cart.subtotal, cart.currency)}
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Shipping and taxes calculated when you Buy it now.
            </p>
            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className={cn(sfBtn("outline"), "w-full")}
            >
              View cart
            </Link>
            {cart.items.length > 0 && !cart.hasUnavailableItems ? (
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                className={cn(sfBtn("primary"), "w-full")}
              >
                Buy it now
              </Link>
            ) : (
              <button
                type="button"
                disabled
                title={
                  cart.items.length === 0
                    ? "Your cart is empty"
                    : "Remove unavailable items before Buy it now"
                }
                className={cn(sfBtn("primary"), "w-full opacity-50")}
              >
                Buy it now
              </button>
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
}
