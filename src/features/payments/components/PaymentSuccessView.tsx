"use client";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ShippingAddressSnapshot } from "@/features/addresses/types";
import { formatMoney } from "@/features/catalog/money";
import type { OrderItemView } from "@/features/orders/types";
import { OrderReceiptDialog } from "@/features/payments/components/OrderReceiptDialog";
import {
  orderStatusTone,
  paymentStatusTone,
  StatusPill,
} from "@/features/payments/components/payment-status-ui";
import type { ReceiptTotals } from "@/features/payments/receipt-totals";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { sfBtn, sfCard, sfDisplay } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

export type PaymentSuccessViewProps = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  orderStatus: string;
  finalized: boolean;
  items: OrderItemView[];
  shippingAddress: ShippingAddressSnapshot;
  totals: ReceiptTotals;
};

export function PaymentSuccessView({
  orderNumber,
  amount,
  currency,
  paymentStatus,
  orderStatus,
  finalized,
  items,
  shippingAddress,
  totals,
}: PaymentSuccessViewProps) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const previewItems = items.slice(0, 4);
  const extraCount = Math.max(0, items.length - previewItems.length);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <motion.section
        className="flex flex-col items-center text-center"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative mb-5 flex h-24 w-24 items-center justify-center md:h-28 md:w-28">
          {!reduceMotion ? (
            <>
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)]"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1.35, opacity: 0 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
              <motion.span
                aria-hidden
                className="absolute inset-[10%] rounded-full border border-[color-mix(in_srgb,var(--color-success)_35%,transparent)]"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.05 }}
              />
            </>
          ) : null}
          <motion.div
            className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-success)] text-white shadow-[0_14px_34px_color-mix(in_srgb,var(--color-success)_35%,transparent)] md:h-[4.5rem] md:w-[4.5rem]"
            initial={reduceMotion ? false : { scale: 0.5, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
          >
            <CheckRoundedIcon className="!text-4xl" aria-hidden />
          </motion.div>
        </div>

        <StorefrontHeading
          title="Payment successful"
          as="h1"
          align="center"
          className="!text-3xl md:!text-4xl"
        />
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-muted)] md:text-[0.95rem]">
          {finalized
            ? "Your payment was verified and your order is confirmed."
            : "Your payment was verified. Your order is being finalized."}
        </p>
        <p
          className={cn(
            sfDisplay(),
            "mt-4 text-3xl tracking-tight text-[var(--color-foreground)] md:text-4xl",
          )}
        >
          {formatMoney(amount, currency)}
        </p>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
          Order {orderNumber}
        </p>
      </motion.section>

      {previewItems.length > 0 ? (
        <motion.section
          className="mt-8"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          aria-label="Items in this order"
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {previewItems.map((item, index) => (
              <li
                key={item.id}
                className={cn(
                  sfCard(),
                  "flex items-center gap-3 p-3 text-left",
                )}
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[calc(var(--radius-default,0.75rem)-2px)] bg-[var(--color-surface)]">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-contain p-1.5"
                      sizes="64px"
                      priority={index === 0}
                    />
                  ) : (
                    <span
                      className="flex h-full items-center justify-center text-sm font-semibold text-[var(--color-muted)]"
                      aria-hidden
                    >
                      {item.productName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                    {item.productName}
                  </p>
                  {item.variantName ? (
                    <p className="truncate text-xs text-[var(--color-muted)]">
                      {item.variantName}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    Qty {item.quantity} ·{" "}
                    {formatMoney(item.lineTotal, currency)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {extraCount > 0 ? (
            <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
              +{extraCount} more item{extraCount === 1 ? "" : "s"} on your order
            </p>
          ) : null}
        </motion.section>
      ) : null}

      <motion.section
        className={cn(sfCard(), "mt-6 overflow-hidden text-left")}
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.18 }}
      >
        <div className="border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] px-5 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              <LocalShippingOutlinedIcon className="!text-base" aria-hidden />
              Delivering to
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--color-foreground)]">
              {shippingAddress.fullName || "Customer"}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
              {[shippingAddress.city, shippingAddress.state, shippingAddress.postalCode]
                .filter(Boolean)
                .join(", ") || "Address on file"}
            </p>
          </div>
        </div>

        <dl className="grid gap-0 sm:grid-cols-2">
          <div className="border-b border-[var(--color-border)] px-5 py-3.5 sm:border-r">
            <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Payment status
            </dt>
            <dd className="mt-2">
              <StatusPill
                status={paymentStatus}
                tone={paymentStatusTone(paymentStatus)}
              />
            </dd>
          </div>
          <div className="border-b border-[var(--color-border)] px-5 py-3.5">
            <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Order status
            </dt>
            <dd className="mt-2">
              <StatusPill
                status={orderStatus}
                tone={orderStatusTone(orderStatus)}
              />
            </dd>
          </div>
          <div className="border-b border-[var(--color-border)] px-5 py-3.5 sm:border-r">
            <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Amount paid
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
              {formatMoney(amount, currency)}
            </dd>
          </div>
          <div className="border-b border-[var(--color-border)] px-5 py-3.5">
            <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Order number
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
              {orderNumber}
            </dd>
          </div>
        </dl>
      </motion.section>

      <motion.div
        className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.24 }}
      >
        <button
          type="button"
          onClick={() => setReceiptOpen(true)}
          className={cn(sfBtn("primary"), "sm:min-w-[10rem]")}
        >
          View order
        </button>
        <Link
          href="/products"
          className={cn(sfBtn("outline"), "sm:min-w-[10rem]")}
        >
          Continue shopping
        </Link>
      </motion.div>

      <OrderReceiptDialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        orderNumber={orderNumber}
        amount={amount}
        currency={currency}
        paymentStatus={paymentStatus}
        orderStatus={orderStatus}
        items={items}
        shippingAddress={shippingAddress}
        totals={totals}
      />
    </div>
  );
}
