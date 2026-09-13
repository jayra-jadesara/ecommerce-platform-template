"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { ShippingAddressSnapshot } from "@/features/addresses/types";
import { formatMoney } from "@/features/catalog/money";
import { OrderStatusTimeline } from "@/features/orders/components/OrderStatusTimeline";
import { RequestReplaceDialog } from "@/features/orders/components/RequestReplaceDialog";
import { orderStatusLabel } from "@/features/orders/state-machine";
import type { OrderDetail, OrderItemView } from "@/features/orders/types";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { sfBtn, sfCard } from "@/components/ui/storefront-classes";
import { formatDateTime } from "@/lib/format-date";
import {
  returnPolicyAllowsReplace,
  returnPolicyBlocksRefund,
  returnPolicyLabel,
  replaceRequestStatusLabel,
} from "@/features/shipping/policies";
import { cn } from "@/lib/cn";

function addressLines(address: ShippingAddressSnapshot): string[] {
  return [
    address.fullName,
    address.phone,
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    address.country,
  ].filter((line): line is string => Boolean(line?.trim()));
}

export function AccountOrderDetailView({ order }: { order: OrderDetail }) {
  const [addressOpen, setAddressOpen] = useState(false);
  const [replaceItem, setReplaceItem] = useState<OrderItemView | null>(null);
  const titleId = useId();
  const lines = addressLines(order.shippingAddress);
  const hasRestrictedPolicy = order.items.some((item) =>
    returnPolicyBlocksRefund(item.returnPolicy),
  );
  const canRequestReplace =
    order.status === "DELIVERED" || order.status === "SHIPPED";
  const openByItem = useMemo(() => {
    const map = new Map<string, (typeof order.replaceRequests)[number]>();
    for (const req of order.replaceRequests ?? []) {
      if (req.status === "REQUESTED" || req.status === "APPROVED") {
        map.set(req.orderItemId, req);
      }
    }
    return map;
  }, [order.replaceRequests]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-[var(--color-muted)]">
          <Link
            href="/account/orders"
            className="underline-offset-2 hover:underline"
          >
            Orders
          </Link>{" "}
          / {order.orderNumber}
        </p>
        <StorefrontHeading
          title={`Order ${order.orderNumber}`}
          as="h2"
          align="left"
          className="!text-2xl md:!text-[1.75rem]"
        />
        <p className="text-sm text-[var(--color-muted)]">
          {formatDateTime(order.createdAt)} · {orderStatusLabel(order.status)}
        </p>
      </header>

      <OrderStatusTimeline status={order.status} />

      {hasRestrictedPolicy ? (
        <p
          className={cn(
            sfCard(),
            "border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950",
          )}
        >
          Return policy for items in this order may limit refunds or replacements.
          Check each line below.
        </p>
      ) : null}

      <section className={cn(sfCard(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold tracking-tight">Items</h3>
        </div>
        <ul className="divide-y divide-[var(--color-border)]">
          {order.items.map((item) => {
            const openReq = openByItem.get(item.id);
            const showReplace =
              canRequestReplace &&
              returnPolicyAllowsReplace(item.returnPolicy) &&
              !openReq;
            return (
              <li
                key={item.id}
                className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[calc(var(--radius-default,0.75rem)-2px)] bg-[var(--color-surface)] sm:h-24 sm:w-24">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        unoptimized
                        className="object-contain p-2"
                        sizes="96px"
                      />
                    ) : (
                      <span
                        className="flex h-full items-center justify-center text-lg font-semibold text-[var(--color-muted)]"
                        aria-hidden
                      >
                        {item.productName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--color-foreground)] sm:text-base">
                      {item.productName}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)] sm:text-sm">
                      {[item.variantName, `Qty ${item.quantity}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-1 text-xs font-medium text-amber-900">
                      {returnPolicyLabel(item.returnPolicy)}
                    </p>
                    {openReq ? (
                      <p className="mt-1 text-xs font-medium text-[var(--color-primary)]">
                        Replace: {replaceRequestStatusLabel(openReq.status)}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-sm font-semibold sm:text-base">
                    {formatMoney(item.lineTotal, order.currency)}
                  </p>
                </div>
                {showReplace ? (
                  <button
                    type="button"
                    onClick={() => setReplaceItem(item)}
                    className={cn(sfBtn("secondary"), "w-full text-sm sm:w-auto")}
                  >
                    Request replace
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {(order.replaceRequests?.length ?? 0) > 0 ? (
        <section className={cn(sfCard(), "p-4 sm:p-5")}>
          <h3 className="text-sm font-semibold tracking-tight">
            Replacement requests
          </h3>
          <ul className="mt-3 space-y-3 text-sm">
            {order.replaceRequests.map((req) => (
              <li
                key={req.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{req.productName}</p>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                    {replaceRequestStatusLabel(req.status)}
                  </span>
                </div>
                <p className="mt-1 text-[var(--color-muted)]">{req.reason}</p>
                {req.adminNote ? (
                  <p className="mt-1 text-xs">Shop note: {req.adminNote}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className={cn(sfCard(), "p-4 sm:p-5")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <LocalShippingOutlinedIcon
                  className="!text-base text-[var(--color-primary)]"
                  aria-hidden
                />
                Shipping
              </h3>
              <p className="mt-2 truncate text-sm font-semibold text-[var(--color-foreground)]">
                {order.shippingAddress.fullName || "Customer"}
              </p>
              <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
                {[
                  order.shippingAddress.city,
                  order.shippingAddress.state,
                  order.shippingAddress.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ") || "Address on file"}
              </p>
              {order.trackingNumber ? (
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  Tracking:{" "}
                  <span className="font-medium text-[var(--color-foreground)]">
                    {order.shippingProvider
                      ? `${order.shippingProvider} · `
                      : ""}
                    {order.trackingNumber}
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  Tracking number will appear here if the store adds one.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setAddressOpen(true)}
              className={cn(sfBtn("outline"), "!min-h-9 !px-3 !py-1.5 !text-xs")}
            >
              View
            </button>
          </div>
        </section>

        <section className={cn(sfCard(), "p-4 sm:p-5")}>
          <h3 className="text-sm font-semibold">Payment</h3>
          {order.payment ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-muted)]">Status</dt>
                <dd className="font-medium">{order.payment.status}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-muted)]">Provider</dt>
                <dd className="font-medium capitalize">
                  {order.payment.provider}
                </dd>
              </div>
              {order.payment.paymentMethod ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--color-muted)]">Method</dt>
                  <dd className="font-medium">{order.payment.paymentMethod}</dd>
                </div>
              ) : null}
              {order.payment.providerPaymentId ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--color-muted)]">Reference</dt>
                  <dd className="max-w-[11rem] truncate text-xs font-medium">
                    {order.payment.providerPaymentId}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              No payment on file.
            </p>
          )}
        </section>
      </div>

      <section className={cn(sfCard(), "p-4 sm:p-5")}>
        <h3 className="text-sm font-semibold">Totals</h3>
        <dl className="mt-3 space-y-2 text-sm">
          {[
            ["Subtotal", order.subtotal],
            [
              order.couponCode
                ? `Discount (${order.couponCode})`
                : "Discount",
              order.discountAmount,
            ],
            ["Shipping", order.shippingAmount],
            ["Payment fee", order.gatewayFee],
            ["Tax", order.taxAmount],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between gap-3">
              <dt className="text-[var(--color-muted)]">{label}</dt>
              <dd className="font-medium">
                {formatMoney(Number(value), order.currency)}
              </dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-[var(--color-border)] pt-3 text-base font-semibold">
            <dt>Grand total</dt>
            <dd>{formatMoney(order.grandTotal, order.currency)}</dd>
          </div>
        </dl>
      </section>

      <Dialog
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby={titleId}
      >
        <DialogTitle
          id={titleId}
          className="flex items-center justify-between gap-3 !pr-3"
        >
          <span className="flex items-center gap-2 text-base font-semibold">
            <PlaceOutlinedIcon
              className="!text-[var(--color-primary)]"
              aria-hidden
            />
            Delivery details
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setAddressOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] hover:text-[var(--color-foreground)]"
          >
            <CloseRoundedIcon fontSize="small" />
          </button>
        </DialogTitle>
        <DialogContent className="!pb-5">
          <ul className="space-y-1.5 text-sm leading-relaxed text-[var(--color-foreground)]">
            {lines.length > 0 ? (
              lines.map((line) => <li key={line}>{line}</li>)
            ) : (
              <li className="text-[var(--color-muted)]">No address on file.</li>
            )}
          </ul>
        </DialogContent>
      </Dialog>

      {replaceItem ? (
        <RequestReplaceDialog
          orderId={order.id}
          item={replaceItem}
          photoRequired={Boolean(order.replacePhotoRequired)}
          open={Boolean(replaceItem)}
          onClose={() => setReplaceItem(null)}
        />
      ) : null}
    </div>
  );
}
