"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import { useState } from "react";
import { getCartAction } from "@/features/cart/actions";
import { cartQueryKey } from "@/features/cart/query-keys";
import { emptyCartView } from "@/features/cart/types";
import { formatMoney } from "@/features/catalog/money";

export function HeaderCartControl() {
  const [open, setOpen] = useState(false);
  const { data: cart = emptyCartView() } = useQuery({
    queryKey: cartQueryKey,
    queryFn: () => getCartAction(),
    staleTime: 30_000,
  });

  return (
    <>
      <IconButton
        aria-label={`Open cart, ${cart.itemCount} items`}
        size="small"
        onClick={() => setOpen(true)}
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
              "!bg-[var(--color-card)] !text-[var(--color-foreground)] w-full max-w-sm",
            "aria-label": "Shopping cart",
          },
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <h2 className="font-semibold">Cart</h2>
            <button
              type="button"
              aria-label="Close cart"
              className="rounded-md px-2 py-1 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {cart.items.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                Your cart is empty.
              </p>
            ) : (
              <ul className="space-y-3" aria-label="Recent cart items">
                {cart.items.slice(0, 8).map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.imageAlt}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.productName}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {item.variantName} · Qty {item.quantity}
                      </p>
                      <p className="text-xs">
                        {formatMoney(item.lineTotal, cart.currency)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 border-t border-[var(--color-border)] px-4 py-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-semibold">
                {formatMoney(cart.subtotal, cart.currency)}
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Subtotal only — final pricing at checkout.
            </p>
            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center rounded-md bg-[var(--color-button-background)] px-3 py-2 text-sm font-medium text-[var(--color-button-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              View cart
            </Link>
            {cart.items.length > 0 && !cart.hasUnavailableItems ? (
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              >
                Checkout
              </Link>
            ) : (
              <button
                type="button"
                disabled
                title={
                  cart.items.length === 0
                    ? "Your cart is empty"
                    : "Remove unavailable items before checkout"
                }
                className="flex w-full items-center justify-center rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium opacity-50"
              >
                Checkout
              </button>
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
}
