"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Image from "next/image";
import { useState } from "react";
import type { ShippingAddressSnapshot } from "@/features/addresses/types";
import { formatMoney } from "@/features/catalog/money";
import type { OrderItemView } from "@/features/orders/types";
import { downloadOrderReceiptPdf } from "@/features/payments/download-order-receipt-pdf";
import {
  receiptTotalRows,
  type ReceiptTotals,
} from "@/features/payments/receipt-totals";
import {
  orderStatusTone,
  paymentStatusTone,
  StatusPill,
} from "@/features/payments/components/payment-status-ui";
import { usePlatformConfig } from "@/providers";
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

const POPUP_WIDTH = 940;
const POPUP_HEIGHT = 640;

export type OrderReceiptDialogProps = {
  open: boolean;
  onClose: () => void;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  orderStatus: string;
  items: OrderItemView[];
  shippingAddress: ShippingAddressSnapshot;
  totals: ReceiptTotals;
};

function formatAddressLines(address: ShippingAddressSnapshot): string[] {
  return [
    address.fullName,
    address.phone,
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    address.country,
  ].filter((line): line is string => Boolean(line?.trim()));
}

export function OrderReceiptDialog({
  open,
  onClose,
  orderNumber,
  amount,
  currency,
  paymentStatus,
  orderStatus,
  items,
  shippingAddress,
  totals,
}: OrderReceiptDialogProps) {
  const { brand, theme } = usePlatformConfig();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const addressLines = formatAddressLines(shippingAddress);
  const payTone = paymentStatusTone(paymentStatus);
  const ordTone = orderStatusTone(orderStatus);
  const logoUrl = brand.logoUrl || brand.logoDarkUrl;
  const totalRows = receiptTotalRows(totals);

  async function handleDownload() {
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadOrderReceiptPdf({
        brandName: brand.name,
        brandTagline: brand.tagline,
        logoUrl,
        colors: theme.light,
        orderNumber,
        amount,
        currency,
        paymentStatus,
        orderStatus,
        items,
        shippingAddress,
        totals,
      });
    } catch {
      setDownloadError("Could not download the receipt. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

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
            borderRadius: "1.35rem",
            bgcolor: "var(--color-card)",
            color: "var(--color-foreground)",
            boxShadow:
              "0 24px 64px color-mix(in srgb, var(--color-foreground) 18%, transparent)",
          },
          "aria-label": `Receipt for order ${orderNumber}`,
        },
      }}
    >
      <header className="shrink-0 border-b border-[var(--color-border)]">
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt=""
                  fill
                  unoptimized
                  className="object-contain p-1.5"
                  sizes="44px"
                />
              ) : (
                <span className="text-sm font-bold text-[var(--color-primary)]">
                  {(brand.name || "S").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-[var(--color-foreground)]">
                {brand.name}
              </p>
              <p className="truncate text-xs text-[var(--color-muted)]">
                Payment receipt
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <StatusPill status="PAID" tone="success" />
            <IconButton
              type="button"
              onClick={onClose}
              aria-label="Close receipt"
              size="small"
              className="!text-[var(--color-muted)] hover:!bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] hover:!text-[var(--color-foreground)]"
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Order
            </p>
            <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
              {orderNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
            className={cn(
              sfBtn("outline"),
              "!min-h-9 !gap-1.5 !px-3.5 !py-1.5 !text-xs",
            )}
          >
            <DownloadRoundedIcon className="!text-base" aria-hidden />
            {downloading ? "Preparing…" : "Download PDF"}
          </button>
        </div>
        {downloadError ? (
          <p className="px-5 pb-3 text-xs text-[var(--color-error)]" role="alert">
            {downloadError}
          </p>
        ) : null}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
        <section
          className="min-h-0 overflow-y-auto border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_45%,var(--color-card))] p-5 md:border-b-0 md:border-r"
          aria-label="Product details"
        >
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Products
          </h3>
          {items.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-muted)]">
              No items on this order.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
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
                    <p className="mt-1 text-xs font-medium text-[var(--color-muted)]">
                      Qty {item.quantity} ·{" "}
                      <span className="text-[var(--color-foreground)]">
                        {formatMoney(item.lineTotal, currency)}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]">
            <h4 className="text-sm font-semibold text-[var(--color-foreground)]">
              Totals
            </h4>
            <dl className="mt-3 space-y-1.5 text-sm">
              {totalRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className="text-[var(--color-muted)]">{row.label}</dt>
                  <dd className="tabular-nums text-[var(--color-foreground)]">
                    {formatMoney(row.value, currency)}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-[var(--color-border)] pt-2 text-base font-semibold">
                <dt>Grand total</dt>
                <dd className="tabular-nums">
                  {formatMoney(totals.grandTotal, currency)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section
          className="min-h-0 overflow-y-auto p-5"
          aria-label="Order details"
        >
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Order details
          </h3>

          <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_50%,var(--color-card))] p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              <LocalShippingOutlinedIcon
                className="!text-base !text-[var(--color-primary)]"
                aria-hidden
              />
              Delivering to
            </p>
            <ul className="mt-2.5 space-y-1 text-sm leading-relaxed text-[var(--color-foreground)]">
              {addressLines.length > 0 ? (
                addressLines.map((line) => (
                  <li key={line}>{line}</li>
                ))
              ) : (
                <li className="text-[var(--color-muted)]">No address on file.</li>
              )}
            </ul>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-3.5 shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]">
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Payment status
              </dt>
              <dd className="mt-2">
                <StatusPill status={paymentStatus} tone={payTone} />
              </dd>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-3.5 shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]">
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Order status
              </dt>
              <dd className="mt-2">
                <StatusPill status={orderStatus} tone={ordTone} />
              </dd>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-3.5 shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]">
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Amount paid
              </dt>
              <dd className="mt-1.5 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
                {formatMoney(amount, currency)}
              </dd>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-3.5 shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]">
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Order number
              </dt>
              <dd className="mt-1.5 break-all text-sm font-semibold text-[var(--color-foreground)]">
                {orderNumber}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </Dialog>
  );
}
