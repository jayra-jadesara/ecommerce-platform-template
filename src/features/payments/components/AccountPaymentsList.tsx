"use client";

import { useState } from "react";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import Link from "next/link";
import { formatMoney } from "@/features/catalog/money";
import {
  PaymentMethodBadge,
  paymentInstrumentOrProviderLabel,
} from "@/features/orders/payment-method-ui";
import {
  getPaymentReceiptAction,
  type PaymentReceiptData,
} from "@/features/payments/get-payment-receipt-action";
import { OrderReceiptDialog } from "@/features/payments/components/OrderReceiptDialog";
import type { ReceiptPdfInput } from "@/features/payments/download-order-receipt-pdf";
import type { PaymentInstrument } from "@/features/payments/razorpay-instrument";
import {
  paymentStatusTone,
  StatusPill,
} from "@/features/payments/components/payment-status-ui";
import { usePlatformConfig } from "@/providers";
import {
  sfAccountGridTable,
  sfAccountGridTd,
  sfAccountGridTh,
  sfAccountGridThead,
  sfAccountGridTr,
  sfAccountGridWrap,
  sfBtn,
  sfCard,
} from "@/components/ui/storefront-classes";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/cn";

export type AccountPaymentRow = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  provider: string;
  paymentMethod?: string | null;
  instrument?: PaymentInstrument | null;
  orderId: string;
  orderNumber: string;
  orderStatus?: string;
  itemCount: number;
  itemSummary: string | null;
};

const actionBtnClass = cn(
  sfBtn("outline"),
  "!min-h-9 !gap-1.5 !px-3 !py-1.5 !text-xs",
);

function paymentStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  if (status === "PENDING") return "Pending";
  if (status === "CAPTURED") return "Captured";
  if (status === "AUTHORIZED") return "Authorized";
  if (status === "CREATED") return "Created";
  if (status === "FAILED") return "Failed";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "REFUNDED") return "Refunded";
  return status;
}

function PaymentCells({ payment }: { payment: AccountPaymentRow }) {
  const instrumentLine = paymentInstrumentOrProviderLabel({
    provider: payment.provider,
    paymentMethod: payment.paymentMethod,
    instrument: payment.instrument,
  });
  const showInstrumentDetail =
    Boolean(payment.instrument) &&
    instrumentLine !== "Cash on Delivery" &&
    instrumentLine !== "Razorpay" &&
    instrumentLine !== "—";

  return (
    <div className="min-w-0 space-y-1">
      {payment.provider ? (
        <PaymentMethodBadge provider={payment.provider} size="sm" />
      ) : null}
      {showInstrumentDetail ? (
        <p className="truncate text-[0.7rem] text-[var(--color-muted)]">
          {instrumentLine}
        </p>
      ) : null}
    </div>
  );
}

async function downloadPdfLazy(input: ReceiptPdfInput) {
  const { downloadOrderReceiptPdf } = await import(
    "@/features/payments/download-order-receipt-pdf"
  );
  return downloadOrderReceiptPdf(input);
}

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
      await downloadPdfLazy({
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
                  <Link
                    href={`/account/orders/${payment.orderId}`}
                    className="font-semibold text-[var(--color-primary)] underline underline-offset-2 hover:opacity-80"
                  >
                    {payment.orderNumber}
                  </Link>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {formatDateTime(payment.createdAt)} · {payment.itemCount}{" "}
                    item
                    {payment.itemCount === 1 ? "" : "s"}
                    {payment.itemSummary ? ` · ${payment.itemSummary}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill
                      status={paymentStatusLabel(payment.status)}
                      tone={paymentStatusTone(payment.status)}
                    />
                    <PaymentCells payment={payment} />
                  </div>
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

      <div className={sfAccountGridWrap()}>
        <table className={sfAccountGridTable()}>
          <thead className={sfAccountGridThead()}>
            <tr>
              <th className={sfAccountGridTh()}>Order</th>
              <th className={sfAccountGridTh()}>Items</th>
              <th className={sfAccountGridTh()}>Status</th>
              <th className={sfAccountGridTh()}>Payment</th>
              <th className={sfAccountGridTh()}>Date</th>
              <th className={sfAccountGridTh("right")}>Amount</th>
              <th className={sfAccountGridTh("right")}>Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className={sfAccountGridTr()}>
                <td className={sfAccountGridTd()}>
                  <Link
                    href={`/account/orders/${payment.orderId}`}
                    className="font-semibold text-[var(--color-primary)] underline underline-offset-2 hover:opacity-80"
                  >
                    {payment.orderNumber}
                  </Link>
                </td>
                <td className={sfAccountGridTd()}>
                  <p className="text-[var(--color-muted)]">
                    {payment.itemCount} item
                    {payment.itemCount === 1 ? "" : "s"}
                  </p>
                  {payment.itemSummary ? (
                    <p className="mt-0.5 max-w-[14rem] truncate text-[0.7rem] text-[var(--color-muted)]">
                      {payment.itemSummary}
                    </p>
                  ) : null}
                </td>
                <td className={sfAccountGridTd()}>
                  <StatusPill
                    status={paymentStatusLabel(payment.status)}
                    tone={paymentStatusTone(payment.status)}
                  />
                </td>
                <td className={sfAccountGridTd()}>
                  <PaymentCells payment={payment} />
                </td>
                <td
                  className={cn(
                    sfAccountGridTd(),
                    "whitespace-nowrap text-[var(--color-muted)]",
                  )}
                >
                  {formatDateTime(payment.createdAt)}
                </td>
                <td
                  className={cn(
                    sfAccountGridTd("right"),
                    "font-semibold tabular-nums",
                  )}
                >
                  {formatMoney(payment.amount, payment.currency)}
                </td>
                <td className={sfAccountGridTd("right")}>
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
