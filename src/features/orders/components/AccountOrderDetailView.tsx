"use client";

import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { ShippingAddressSnapshot } from "@/features/addresses/types";
import { formatMoney } from "@/features/catalog/money";
import { OrderStatusTimeline } from "@/features/orders/components/OrderStatusTimeline";
import { CancelCodOrderControl } from "@/features/orders/components/CancelCodOrderControl";
import { ReplacePhotoLightbox } from "@/features/orders/components/ReplacePhotoLightbox";
import { ReplaceProgress } from "@/features/orders/components/ReplaceProgress";
import { RequestReplaceDialog } from "@/features/orders/components/RequestReplaceDialog";
import {
  PaymentMethodBadge,
  paymentInstrumentOrProviderLabel,
  paymentMethodFullLabel,
} from "@/features/orders/payment-method-ui";
import { orderStatusLabel } from "@/features/orders/state-machine";
import type { OrderDetail, OrderItemView } from "@/features/orders/types";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import {
  sfAccountGridTable,
  sfAccountGridTd,
  sfAccountGridTh,
  sfAccountGridThead,
  sfAccountGridTr,
  sfBtn,
  sfCard,
} from "@/components/ui/storefront-classes";
import { formatDateTime } from "@/lib/format-date";
import { StatusPill, paymentStatusTone } from "@/features/payments/components/payment-status-ui";
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
  const replaceRequests = useMemo(
    () => order.replaceRequests ?? [],
    [order.replaceRequests],
  );
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
  const paymentProvider = order.payment?.provider ?? null;
  const itemUnitCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const itemLineCount = order.items.length;
  const paymentStatusDisplay =
    order.payment &&
    order.status === "CANCELLED" &&
    (order.payment.status === "PENDING" ||
      order.payment.status === "CREATED" ||
      order.payment.status === "FAILED" ||
      order.payment.status === "CANCELLED")
      ? "CANCELLED"
      : (order.payment?.status ?? null);

  return (
    <div className="space-y-3">
      <header className="space-y-2">
        <p className="text-xs text-[var(--color-muted)]">
          <Link
            href="/account/orders"
            className="underline-offset-2 hover:underline"
          >
            Orders
          </Link>{" "}
          / {order.orderNumber}
        </p>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <StorefrontHeading
              title={`Order ${order.orderNumber}`}
              as="h2"
              align="left"
              className="!mb-0 !text-xl md:!text-2xl"
            />
            <p className="text-xs text-[var(--color-muted)] sm:text-sm">
              {formatDateTime(order.createdAt)} · {orderStatusLabel(order.status)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]">
            {paymentProvider ? (
              <PaymentMethodBadge provider={paymentProvider} />
            ) : null}
            <span
              aria-hidden
              className="h-7 w-px bg-[var(--color-border)]"
            />
            <div className="text-right leading-tight">
              <p className="text-base font-semibold tabular-nums tracking-tight sm:text-lg">
                {formatMoney(order.grandTotal, order.currency)}
              </p>
              <p className="mt-0.5 text-[0.7rem] text-[var(--color-muted)]">
                {itemUnitCount} item{itemUnitCount === 1 ? "" : "s"}
                {itemLineCount !== itemUnitCount
                  ? ` · ${itemLineCount} lines`
                  : ""}
              </p>
            </div>
          </div>
        </div>
      </header>

      <OrderStatusTimeline
        status={order.status}
        paymentProvider={paymentProvider}
      />

      <CancelCodOrderControl
        orderId={order.id}
        status={order.status}
        paymentProvider={paymentProvider}
      />

      {hasRestrictedPolicy ? (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          Return policy for items in this order may limit refunds or replacements.
          Check each line below.
        </p>
      ) : null}

      <section className={cn(sfCard(), "overflow-hidden !rounded-lg")}>
        <div
          className="flex flex-wrap border-b border-[var(--color-border)]"
          role="tablist"
          aria-label="Order sections"
        >
          {tabs.map((item) => {
            const selected = tab === item.id;
            const showBadge =
              item.id === "replacements" && replaceRequests.length > 0;
            const showPayMethod =
              item.id === "payment" && Boolean(paymentProvider);
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
                  "flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold tracking-tight transition-colors sm:px-4 sm:text-sm",
                  selected
                    ? "border-b-2 border-[var(--color-primary)] text-[var(--color-foreground)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                {item.label}
                {showPayMethod ? (
                  <PaymentMethodBadge
                    provider={paymentProvider}
                    size="sm"
                  />
                ) : null}
                {showBadge ? (
                  <span
                    className={cn(
                      "inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
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
                  className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3 sm:px-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] sm:h-14 sm:w-14">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          width={56}
                          height={56}
                          unoptimized
                          className="h-full w-full object-contain p-1"
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
                      <p className="mt-0.5 truncate text-[0.7rem] text-[var(--color-muted)]">
                        {[item.variantName, `Qty ${item.quantity}`]
                          .filter(Boolean)
                          .join(" · ")}
                        {" · "}
                        <span className="font-medium text-amber-900">
                          {returnPolicyLabel(item.returnPolicy)}
                        </span>
                      </p>
                      {returnPolicyAllowsReplace(item.returnPolicy) ? (
                        <p className="mt-0.5 line-clamp-1 text-[0.65rem] text-[var(--color-muted)]">
                          {eligibility.ok
                            ? [
                                "Replacement available if needed.",
                                windowHint,
                              ]
                                .filter(Boolean)
                                .join(" ")
                            : eligibility.reason}
                        </p>
                      ) : returnPolicyBlocksRefund(item.returnPolicy) ? (
                        <p className="mt-0.5 text-[0.65rem] text-[var(--color-muted)]">
                          Final sale — no cash refund
                        </p>
                      ) : null}
                      {openReq ? (
                        <button
                          type="button"
                          className="mt-0.5 text-[0.7rem] font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                          onClick={() => setTab("replacements")}
                        >
                          View replacement progress
                        </button>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatMoney(item.lineTotal, order.currency)}
                    </p>
                  </div>
                  {eligibility.ok ? (
                    <button
                      type="button"
                      onClick={() => setReplaceItem(item)}
                      className={cn(
                        sfBtn("secondary"),
                        "!min-h-8 w-full !px-3 !py-1.5 !text-xs sm:w-auto",
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
            className="grid gap-4 p-3 sm:p-4 md:grid-cols-2 md:gap-6"
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
            className="grid gap-4 p-3 sm:p-4 md:grid-cols-2 md:gap-5"
          >
            <div className="overflow-hidden rounded-lg">
              <h3 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <CreditCardOutlinedIcon
                    className="!text-base text-[var(--color-primary)]"
                    aria-hidden
                  />
                  Payment
                </span>
                {paymentProvider ? (
                  <PaymentMethodBadge provider={paymentProvider} />
                ) : null}
              </h3>
              {order.payment ? (
                <table className={sfAccountGridTable()}>
                  <thead className={sfAccountGridThead()}>
                    <tr>
                      <th className={sfAccountGridTh()}>Field</th>
                      <th className={sfAccountGridTh()}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={sfAccountGridTr()}>
                      <td
                        className={cn(
                          sfAccountGridTd(),
                          "text-[var(--color-muted)]",
                        )}
                      >
                        Status
                      </td>
                      <td className={sfAccountGridTd()}>
                        <StatusPill
                          status={paymentStatusDisplay ?? order.payment.status}
                          tone={paymentStatusTone(
                            paymentStatusDisplay ?? order.payment.status,
                          )}
                        />
                      </td>
                    </tr>
                    <tr className={sfAccountGridTr()}>
                      <td
                        className={cn(
                          sfAccountGridTd(),
                          "text-[var(--color-muted)]",
                        )}
                      >
                        Channel
                      </td>
                      <td className={cn(sfAccountGridTd(), "font-medium")}>
                        {paymentMethodFullLabel(order.payment.provider)}
                      </td>
                    </tr>
                    <tr className={sfAccountGridTr()}>
                      <td
                        className={cn(
                          sfAccountGridTd(),
                          "text-[var(--color-muted)]",
                        )}
                      >
                        Method
                      </td>
                      <td className={cn(sfAccountGridTd(), "font-medium")}>
                        {paymentInstrumentOrProviderLabel({
                          provider: order.payment.provider,
                          paymentMethod: order.payment.paymentMethod,
                          instrument: order.payment.instrument,
                        })}
                      </td>
                    </tr>
                    {order.payment.instrument?.vpa ? (
                      <tr className={sfAccountGridTr()}>
                        <td
                          className={cn(
                            sfAccountGridTd(),
                            "text-[var(--color-muted)]",
                          )}
                        >
                          UPI ID
                        </td>
                        <td
                          className={cn(
                            sfAccountGridTd(),
                            "truncate text-xs font-medium",
                          )}
                        >
                          {order.payment.instrument.vpa}
                        </td>
                      </tr>
                    ) : null}
                    {order.payment.instrument?.last4 ? (
                      <tr className={sfAccountGridTr()}>
                        <td
                          className={cn(
                            sfAccountGridTd(),
                            "text-[var(--color-muted)]",
                          )}
                        >
                          Card
                        </td>
                        <td
                          className={cn(
                            sfAccountGridTd(),
                            "font-medium tabular-nums",
                          )}
                        >
                          {order.payment.instrument.cardType
                            ? `${order.payment.instrument.cardType} · `
                            : ""}
                          ****{order.payment.instrument.last4}
                          {order.payment.instrument.network
                            ? ` · ${order.payment.instrument.network}`
                            : ""}
                        </td>
                      </tr>
                    ) : null}
                    {order.payment.instrument?.bank &&
                    !order.payment.instrument.last4 ? (
                      <tr className={sfAccountGridTr()}>
                        <td
                          className={cn(
                            sfAccountGridTd(),
                            "text-[var(--color-muted)]",
                          )}
                        >
                          Bank
                        </td>
                        <td className={cn(sfAccountGridTd(), "font-medium")}>
                          {order.payment.instrument.bank}
                        </td>
                      </tr>
                    ) : null}
                    {order.payment.instrument?.wallet ? (
                      <tr className={sfAccountGridTr()}>
                        <td
                          className={cn(
                            sfAccountGridTd(),
                            "text-[var(--color-muted)]",
                          )}
                        >
                          Wallet
                        </td>
                        <td className={cn(sfAccountGridTd(), "font-medium")}>
                          {order.payment.instrument.wallet}
                        </td>
                      </tr>
                    ) : null}
                    {order.payment.providerPaymentId ? (
                      <tr className={sfAccountGridTr()}>
                        <td
                          className={cn(
                            sfAccountGridTd(),
                            "text-[var(--color-muted)]",
                          )}
                        >
                          Reference
                        </td>
                        <td
                          className={cn(
                            sfAccountGridTd(),
                            "truncate text-xs font-medium",
                          )}
                        >
                          {order.payment.providerPaymentId}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              ) : (
                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  No payment on file.
                </p>
              )}
            </div>
            <div className="overflow-hidden rounded-lg">
              <h3 className="mb-2 text-sm font-semibold">Totals</h3>
              <table className={sfAccountGridTable()}>
                <thead className={sfAccountGridThead()}>
                  <tr>
                    <th className={sfAccountGridTh()}>Line</th>
                    <th className={sfAccountGridTh("right")}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
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
                    ] as const
                  ).map(([label, value]) => (
                    <tr key={String(label)} className={sfAccountGridTr()}>
                      <td
                        className={cn(
                          sfAccountGridTd(),
                          "text-[var(--color-muted)]",
                        )}
                      >
                        {label}
                      </td>
                      <td
                        className={cn(
                          sfAccountGridTd("right"),
                          "font-medium tabular-nums",
                        )}
                      >
                        {formatMoney(Number(value), order.currency)}
                      </td>
                    </tr>
                  ))}
                  <tr className={sfAccountGridTr()}>
                    <td
                      className={cn(
                        sfAccountGridTd(),
                        "font-semibold text-[var(--color-foreground)]",
                      )}
                    >
                      Grand total
                    </td>
                    <td
                      className={cn(
                        sfAccountGridTd("right"),
                        "font-semibold tabular-nums",
                      )}
                    >
                      {formatMoney(order.grandTotal, order.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "replacements" ? (
          <div
            id={`${titleId}-panel-replacements`}
            role="tabpanel"
            aria-labelledby={`${titleId}-tab-replacements`}
            className="p-3 sm:p-4"
          >
            {replaceRequests.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                No replacement requests for this order yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {replaceRequests.map((req) => (
                  <li
                    key={req.id}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5"
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
