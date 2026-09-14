"use client";

import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { ShippingAddressSnapshot } from "@/features/addresses/types";
import { formatMoney } from "@/features/catalog/money";
import { OrderStatusTimeline } from "@/features/orders/components/OrderStatusTimeline";
import { ReplacePhotoLightbox } from "@/features/orders/components/ReplacePhotoLightbox";
import { ReplaceProgress } from "@/features/orders/components/ReplaceProgress";
import { RequestReplaceDialog } from "@/features/orders/components/RequestReplaceDialog";
import { orderStatusLabel } from "@/features/orders/state-machine";
import type { OrderDetail, OrderItemView } from "@/features/orders/types";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { sfBtn, sfCard } from "@/components/ui/storefront-classes";
import { formatDateTime } from "@/lib/format-date";
import {
  evaluateReplaceEligibility,
  formatReplaceWindowRemaining,
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

type DetailTab = "items" | "delivery" | "payment" | "replacements";

export function AccountOrderDetailView({ order }: { order: OrderDetail }) {
  const [replaceItem, setReplaceItem] = useState<OrderItemView | null>(null);
  const titleId = useId();
  const lines = addressLines(order.shippingAddress);
  const hasRestrictedPolicy = order.items.some((item) =>
    returnPolicyBlocksRefund(item.returnPolicy),
  );
  const rules = order.replaceRules;
  const replaceRequests = order.replaceRequests ?? [];
  const hasOpenReplace = replaceRequests.some(
    (req) => req.status === "REQUESTED" || req.status === "APPROVED",
  );
  const [tab, setTab] = useState<DetailTab>(() =>
    hasOpenReplace ? "replacements" : "items",
  );

  const openByItem = useMemo(() => {
    const map = new Map<string, (typeof replaceRequests)[number]>();
    for (const req of replaceRequests) {
      if (req.status === "REQUESTED" || req.status === "APPROVED") {
        map.set(req.orderItemId, req);
      }
    }
    return map;
  }, [replaceRequests]);
  const attemptsByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const req of replaceRequests) {
      map.set(req.orderItemId, (map.get(req.orderItemId) ?? 0) + 1);
    }
    return map;
  }, [replaceRequests]);

  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: "items", label: "Items" },
    { id: "delivery", label: "Delivery" },
    { id: "payment", label: "Payment" },
    { id: "replacements", label: "Replacements" },
  ];

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
        <div
          className="flex flex-wrap border-b border-[var(--color-border)]"
          role="tablist"
          aria-label="Order sections"
        >
          {tabs.map((item) => {
            const selected = tab === item.id;
            const showBadge =
              item.id === "replacements" && replaceRequests.length > 0;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                id={`${titleId}-tab-${item.id}`}
                aria-controls={`${titleId}-panel-${item.id}`}
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex items-center justify-center gap-2 px-3 py-3 text-sm font-semibold tracking-tight transition-colors sm:px-5",
                  selected
                    ? "border-b-2 border-[var(--color-primary)] text-[var(--color-foreground)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                {item.label}
                {showBadge ? (
                  <span
                    className={cn(
                      "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                      hasOpenReplace
                        ? "bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-[var(--color-primary)]"
                        : "bg-[var(--color-surface)] text-[var(--color-muted)]",
                    )}
                  >
                    {replaceRequests.length}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {tab === "items" ? (
          <ul
            id={`${titleId}-panel-items`}
            role="tabpanel"
            aria-labelledby={`${titleId}-tab-items`}
            className="divide-y divide-[var(--color-border)]"
          >
            {order.items.map((item) => {
              const openReq = openByItem.get(item.id);
              const attemptsUsed = attemptsByItem.get(item.id) ?? 0;
              const eligibility = evaluateReplaceEligibility({
                orderStatus: order.status,
                itemPolicy: item.returnPolicy,
                deliveredAt: order.deliveredAt,
                windowHours: rules.windowHours,
                maxAttempts: rules.maxAttempts,
                priorAttemptCount: attemptsUsed,
                hasOpenRequest: Boolean(openReq),
              });
              const windowHint = formatReplaceWindowRemaining(
                order.deliveredAt,
                rules.windowHours,
              );
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
                      {returnPolicyAllowsReplace(item.returnPolicy) ? (
                        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                          {eligibility.ok
                            ? [
                                "You can request a replacement if something is wrong.",
                                windowHint,
                              ]
                                .filter(Boolean)
                                .join(" ")
                            : eligibility.reason}
                        </p>
                      ) : returnPolicyBlocksRefund(item.returnPolicy) ? (
                        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                          Final sale — cash refund is not available for this
                          item.
                        </p>
                      ) : null}
                      {openReq ? (
                        <button
                          type="button"
                          className="mt-1 text-xs font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                          onClick={() => setTab("replacements")}
                        >
                          View replacement progress
                        </button>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-semibold sm:text-base">
                      {formatMoney(item.lineTotal, order.currency)}
                    </p>
                  </div>
                  {eligibility.ok ? (
                    <button
                      type="button"
                      onClick={() => setReplaceItem(item)}
                      className={cn(
                        sfBtn("secondary"),
                        "w-full text-sm sm:w-auto",
                      )}
                    >
                      Request replace
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        {tab === "delivery" ? (
          <div
            id={`${titleId}-panel-delivery`}
            role="tabpanel"
            aria-labelledby={`${titleId}-tab-delivery`}
            className="grid gap-6 p-4 sm:p-5 md:grid-cols-2 md:gap-8"
          >
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <LocalShippingOutlinedIcon
                  className="!text-base text-[var(--color-primary)]"
                  aria-hidden
                />
                Delivery address
              </h3>
              <ul className="mt-3 space-y-1 text-sm leading-relaxed text-[var(--color-foreground)]">
                {lines.length > 0 ? (
                  lines.map((line) => <li key={line}>{line}</li>)
                ) : (
                  <li className="text-[var(--color-muted)]">No address on file.</li>
                )}
              </ul>
            </div>
            <div className="md:border-l md:border-[var(--color-border)] md:pl-8">
              <h3 className="text-sm font-semibold">Tracking</h3>
              {order.trackingNumber ? (
                <p className="mt-3 text-sm">
                  <span className="font-medium text-[var(--color-foreground)]">
                    {order.shippingProvider
                      ? `${order.shippingProvider} · `
                      : ""}
                    {order.trackingNumber}
                  </span>
                </p>
              ) : (
                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  Tracking number will appear here if the store adds one.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {tab === "payment" ? (
          <div
            id={`${titleId}-panel-payment`}
            role="tabpanel"
            aria-labelledby={`${titleId}-tab-payment`}
            className="grid gap-6 p-4 sm:p-5 md:grid-cols-2 md:gap-8"
          >
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <CreditCardOutlinedIcon
                  className="!text-base text-[var(--color-primary)]"
                  aria-hidden
                />
                Payment
              </h3>
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
                      <dd className="font-medium">
                        {order.payment.paymentMethod}
                      </dd>
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
                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  No payment on file.
                </p>
              )}
            </div>
            <div className="md:border-l md:border-[var(--color-border)] md:pl-8">
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
            </div>
          </div>
        ) : null}

        {tab === "replacements" ? (
          <div
            id={`${titleId}-panel-replacements`}
            role="tabpanel"
            aria-labelledby={`${titleId}-tab-replacements`}
            className="p-4 sm:p-5"
          >
            {replaceRequests.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                No replacement requests for this order yet.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {replaceRequests.map((req) => (
                  <li
                    key={req.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{req.productName}</p>
                        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                          Qty {req.quantity} ·{" "}
                          {replaceRequestStatusLabel(req.status)}
                        </p>
                        <p className="mt-2 text-[var(--color-muted)]">
                          {req.reason}
                        </p>
                        {req.adminNote ? (
                          <p className="mt-1 text-xs">
                            Shop note: {req.adminNote}
                          </p>
                        ) : null}
                      </div>
                      {req.photoUrl ? (
                        <ReplacePhotoLightbox
                          src={req.photoUrl}
                          alt="Replacement evidence"
                        />
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <ReplaceProgress
                        status={req.status}
                        size="comfortable"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>

      {replaceItem ? (
        <RequestReplaceDialog
          orderId={order.id}
          item={replaceItem}
          rules={rules}
          deliveredAt={order.deliveredAt}
          attemptsUsed={attemptsByItem.get(replaceItem.id) ?? 0}
          open={Boolean(replaceItem)}
          onClose={() => setReplaceItem(null)}
        />
      ) : null}
    </div>
  );
}
