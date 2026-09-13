"use client";

import { useState } from "react";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { formatMoney } from "@/features/catalog/money";
import {
  getPaymentReceiptAction,
  type PaymentReceiptData,
} from "@/features/payments/get-payment-receipt-action";
import { downloadOrderReceiptPdf } from "@/features/payments/download-order-receipt-pdf";
import { OrderReceiptDialog } from "@/features/payments/components/OrderReceiptDialog";
import {
  PaymentMetaLine,
  paymentStatusTone,
  StatusPill,
} from "@/features/payments/components/payment-status-ui";
import { usePlatformConfig } from "@/providers";
import { sfBtn, sfCard } from "@/components/ui/storefront-classes";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/cn";

export type AccountPaymentRow = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  provider: string;
  orderNumber: string;
};

const actionBtnClass = cn(
  sfBtn("outline"),
  "!min-h-9 !gap-1.5 !px-3 !py-1.5 !text-xs",
);

export function AccountPaymentsList({
  payments,
}: {
  payments: AccountPaymentRow[];
}) {
  const { brand, theme } = usePlatformConfig();
  const [receipt, setReceipt] = useState<PaymentReceiptData | null>(null);
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function canShowActions(status: string) {
    return status === "CAPTURED" || status === "AUTHORIZED";
  }

  async function openReceipt(paymentId: string) {
    setError(null);
    setLoadingId(paymentId);
    try {
      const data = await getPaymentReceiptAction(paymentId);
      if (!data) {
        setError("Could not load this receipt. Please try again.");
        return;
      }
      setReceipt(data);
      setOpen(true);
    } catch {
      setError("Could not load this receipt. Please try again.");
    } finally {
      setLoadingId(null);
    }
  }

  async function downloadPdf(paymentId: string) {
    setError(null);
    setPdfId(paymentId);
    try {
      const data = await getPaymentReceiptAction(paymentId);
      if (!data) {
        setError("Could not download this receipt. Please try again.");
        return;
      }
      await downloadOrderReceiptPdf({
        brandName: brand.name,
        brandTagline: brand.tagline,
        logoUrl: brand.logoUrl || brand.logoDarkUrl,
        colors: theme.light,
        orderNumber: data.orderNumber,
        amount: data.amount,
        currency: data.currency,
        paymentStatus: data.paymentStatus,
        orderStatus: data.orderStatus,
        items: data.items,
        shippingAddress: data.shippingAddress,
        totals: data.totals,
      });
    } catch {
      setError("Could not download this receipt. Please try again.");
    } finally {
      setPdfId(null);
    }
  }

  function ActionButtons({
    paymentId,
    status,
  }: {
    paymentId: string;
    status: string;
  }) {
    if (!canShowActions(status)) {
      return <span className="text-xs text-[var(--color-muted)]">—</span>;
    }
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void openReceipt(paymentId)}
          disabled={loadingId === paymentId}
          className={actionBtnClass}
        >
          <ReceiptLongOutlinedIcon className="!text-base" aria-hidden />
          {loadingId === paymentId ? "Loading…" : "Receipt"}
        </button>
        <button
          type="button"
          onClick={() => void downloadPdf(paymentId)}
          disabled={pdfId === paymentId}
          className={actionBtnClass}
        >
          <DownloadRoundedIcon className="!text-base" aria-hidden />
          {pdfId === paymentId ? "Preparing…" : "PDF"}
        </button>
      </div>
    );
  }

  return (
    <>
      {error ? (
        <p className="mb-3 text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="space-y-3 md:hidden">
        {payments.map((payment) => {
          const tone = paymentStatusTone(payment.status);
          return (
            <li
              key={payment.id}
              className={cn(sfCard(), "relative overflow-hidden")}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  tone === "success" && "bg-[var(--color-success)]",
                  tone === "error" && "bg-[var(--color-error)]",
                  tone === "warning" && "bg-[var(--color-warning)]",
                  tone === "neutral" && "bg-[var(--color-border)]",
                )}
              />
              <div className="space-y-3 px-4 py-3 pl-5">
                <div>
                  <p className="font-semibold">{payment.orderNumber}</p>
                  <PaymentMetaLine
                    provider={payment.provider}
                    status={payment.status}
                    dateLabel={formatDateTime(payment.createdAt)}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold tabular-nums">
                    {formatMoney(payment.amount, payment.currency)}
                  </p>
                  <ActionButtons
                    paymentId={payment.id}
                    status={payment.status}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className={cn(sfCard(), "hidden overflow-x-auto md:block")}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[color-mix(in_srgb,var(--color-primary)_4%,transparent)]"
              >
                <td className="px-4 py-3 font-semibold text-[var(--color-foreground)]">
                  {payment.orderNumber}
                </td>
                <td className="px-4 py-3 capitalize text-[var(--color-muted)]">
                  {payment.provider}
                </td>
                <td className="px-4 py-3">
                  <StatusPill
                    status={payment.status}
                    tone={paymentStatusTone(payment.status)}
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-[var(--color-muted)]">
                  {formatDateTime(payment.createdAt)}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {formatMoney(payment.amount, payment.currency)}
                </td>
                <td className="px-4 py-3 text-right">
                  <ActionButtons
                    paymentId={payment.id}
                    status={payment.status}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receipt ? (
        <OrderReceiptDialog
          open={open}
          onClose={() => setOpen(false)}
          orderNumber={receipt.orderNumber}
          amount={receipt.amount}
          currency={receipt.currency}
          paymentStatus={receipt.paymentStatus}
          orderStatus={receipt.orderStatus}
          items={receipt.items}
          shippingAddress={receipt.shippingAddress}
          totals={receipt.totals}
        />
      ) : null}
    </>
  );
}
