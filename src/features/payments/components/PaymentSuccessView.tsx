"use client";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
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
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

export type PaymentSuccessViewProps = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  orderStatus: string;
  finalized: boolean;
  paymentMethod?: "razorpay" | "cod";
  items: OrderItemView[];
  shippingAddress: ShippingAddressSnapshot;
  totals: ReceiptTotals;
};

export function PaymentSuccessView({
  orderId,
  orderNumber,
  amount,
  currency,
  paymentStatus,
  orderStatus,
  finalized,
  paymentMethod = "razorpay",
  items,
  shippingAddress,
  totals,
}: PaymentSuccessViewProps) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const previewItems = items.slice(0, 3);
  const extraCount = Math.max(0, items.length - previewItems.length);
  const isCod = paymentMethod === "cod";
  const cityLine = [shippingAddress.city, shippingAddress.state, shippingAddress.postalCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <motion.div
        className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_16px_40px_color-mix(in_srgb,var(--color-foreground)_6%,transparent)]"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="grid md:grid-cols-[1.05fr_0.95fr]">
          {/* Left: confirmation */}
          <div className="relative flex flex-col justify-center border-b border-[var(--color-border)] px-5 py-6 md:border-b-0 md:border-r md:px-7 md:py-7">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-success)] text-white shadow-sm">
                <CheckRoundedIcon className="!text-[1.5rem]" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  {isCod ? "Cash on delivery" : "Payment"}
                </p>
                <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--color-foreground)] md:text-[1.75rem]">
                  {isCod ? "Order placed" : "Payment successful"}
                </h1>
                <p className="mt-1.5 text-sm leading-snug text-[var(--color-muted)]">
                  {isCod
                    ? "Pay cash when it arrives. No online fee."
                    : finalized
                      ? "Payment verified — order confirmed."
                      : "Payment verified — finalizing order."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-[var(--color-border)] pt-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Total
                </p>
                <p className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
                  {formatMoney(amount, currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Order
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--color-foreground)]">
                  {orderNumber}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill
                status={
                  isCod && paymentStatus === "PENDING"
                    ? "Pay on delivery"
                    : paymentStatus
                }
                tone={
                  isCod && paymentStatus === "PENDING"
                    ? "warning"
                    : paymentStatusTone(paymentStatus)
                }
              />
              <StatusPill
                status={orderStatus}
                tone={orderStatusTone(orderStatus)}
              />
            </div>

            <p className="mt-3 truncate text-xs text-[var(--color-muted)]">
              Deliver to{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                {shippingAddress.fullName || "Customer"}
              </span>
              {cityLine ? ` · ${cityLine}` : ""}
            </p>

            <div className="mt-5 space-y-2.5">
              <Link
                href={`/account/orders/${orderId}`}
                className={cn(
                  sfBtn("primary"),
                  "!min-h-11 w-full !justify-center !text-sm",
                )}
              >
                <ReceiptLongOutlinedIcon className="!text-base" aria-hidden />
                View my order
              </Link>
              <div className="flex items-center justify-center gap-4 pt-0.5 text-sm">
                <button
                  type="button"
                  onClick={() => setReceiptOpen(true)}
                  className="font-medium text-[var(--color-muted)] underline-offset-4 transition-colors hover:text-[var(--color-foreground)] hover:underline"
                >
                  Download receipt
                </button>
                <span className="text-[var(--color-border)]" aria-hidden>
                  ·
                </span>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1 font-medium text-[var(--color-muted)] underline-offset-4 transition-colors hover:text-[var(--color-foreground)] hover:underline"
                >
                  Shop more
                </Link>
              </div>
            </div>
          </div>

          {/* Right: items */}
          <div className="bg-[color-mix(in_srgb,var(--color-surface)_55%,var(--color-card))] px-5 py-5 md:px-6 md:py-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Items · {items.length}
            </p>
            <ul className="mt-3 space-y-2.5">
              {previewItems.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface)]">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        unoptimized
                        className="object-contain p-1"
                        sizes="48px"
                        priority={index === 0}
                      />
                    ) : (
                      <span
                        className="flex h-full items-center justify-center text-xs font-semibold text-[var(--color-muted)]"
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
                    <p className="truncate text-[11px] text-[var(--color-muted)]">
                      {item.variantName ? `${item.variantName} · ` : ""}
                      Qty {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                    {formatMoney(item.lineTotal, currency)}
                  </p>
                </li>
              ))}
            </ul>
            {extraCount > 0 ? (
              <p className="mt-2 text-center text-[11px] text-[var(--color-muted)]">
                +{extraCount} more on receipt
              </p>
            ) : null}
          </div>
        </div>
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
