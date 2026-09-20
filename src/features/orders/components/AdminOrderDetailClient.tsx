"use client";

import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
} from "@/features/admin/ui/admin-classes";
import { formatMoney } from "@/features/catalog/money";
import {
  adminMarkOrderRefundedAction,
  adminReviewReplaceRequestAction,
  adminUpdateOrderStatusAction,
  adminUpdateOrderTrackingAction,
} from "@/features/orders/actions";
import { AdminActivityTimeline } from "@/features/orders/components/AdminActivityTimeline";
import { OrderStatusTimeline } from "@/features/orders/components/OrderStatusTimeline";
import { ReplacePhotoLightbox } from "@/features/orders/components/ReplacePhotoLightbox";
import { ReplaceProgress } from "@/features/orders/components/ReplaceProgress";
import {
  canTransitionOrderStatus,
  orderStatusLabel,
} from "@/features/orders/state-machine";
import type { OrderDetail } from "@/features/orders/types";
import {
  returnPolicyBlocksRefund,
  returnPolicyLabel,
  replaceRequestStatusLabel,
} from "@/features/shipping/policies";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/cn";
import type { OrderStatus, PaymentStatus } from "@/types/database";

type ConfirmAction = { kind: "cancel" } | { kind: "refund" };
type DetailTab = "order" | "customer" | "activity" | "replacement";

function statusTone(
  status: OrderStatus,
): "success" | "warning" | "error" | "info" | "neutral" {
  switch (status) {
    case "DELIVERED":
      return "success";
    case "CANCELLED":
    case "REFUNDED":
      return "error";
    case "PENDING":
      return "warning";
    case "PROCESSING":
    case "SHIPPED":
    case "CONFIRMED":
      return "info";
    default:
      return "neutral";
  }
}

function paymentTone(
  status: PaymentStatus | null | undefined,
): "success" | "warning" | "error" | "info" | "neutral" {
  switch (status) {
    case "CAPTURED":
    case "AUTHORIZED":
      return "success";
    case "FAILED":
      return "error";
    case "PENDING":
    case "CREATED":
      return "warning";
    case "REFUNDED":
      return "info";
    default:
      return "neutral";
  }
}

function nextPrimaryAction(status: OrderStatus): {
  label: string;
  status: OrderStatus;
  hint: string;
} | null {
  switch (status) {
    case "CONFIRMED":
    case "PENDING":
      return {
        label: "Start processing",
        status: "PROCESSING",
        hint: "Pack the items and prepare for courier.",
      };
    case "PROCESSING":
      return {
        label: "Mark as shipped",
        status: "SHIPPED",
        hint: "Order has left your shop / given to courier.",
      };
    case "SHIPPED":
      return {
        label: "Mark as delivered",
        status: "DELIVERED",
        hint: "Customer received the parcel.",
      };
    default:
      return null;
  }
}

function SectionTitle({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
        {icon}
      </span>
      {children}
    </h2>
  );
}

export function AdminOrderDetailClient({
  initialOrder,
  canUpdate,
  canRefund,
}: {
  initialOrder: OrderDetail;
  canUpdate: boolean;
  canRefund: boolean;
}) {
  const router = useRouter();
  const tabsId = useId();
  const [order, setOrder] = useState(initialOrder);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [provider, setProvider] = useState(order.shippingProvider ?? "");
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [pending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const replaceRequests = order.replaceRequests ?? [];
  const hasOpenReplace = replaceRequests.some(
    (req) => req.status === "REQUESTED" || req.status === "APPROVED",
  );
  const [tab, setTab] = useState<DetailTab>(() =>
    hasOpenReplace ? "replacement" : "order",
  );

  const hasRestrictedPolicy = order.items.some((item) =>
    returnPolicyBlocksRefund(item.returnPolicy),
  );
  const refundBlockedByPolicy = hasRestrictedPolicy;
  const primary = useMemo(() => nextPrimaryAction(order.status), [order.status]);
  const primaryAllowed = primary
    ? canTransitionOrderStatus(order.status, primary.status)
    : false;

  const activitiesNewestFirst = useMemo(
    () =>
      [...(order.activities ?? [])].sort(
        (a, b) =>
          Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
          b.id.localeCompare(a.id),
      ),
    [order.activities],
  );

  /* eslint-disable react-hooks/set-state-in-effect -- sync refreshed server order into local editable state */
  useEffect(() => {
    setOrder(initialOrder);
    setProvider(initialOrder.shippingProvider ?? "");
    setTracking(initialOrder.trackingNumber ?? "");
  }, [initialOrder]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function run(
    action: () => Promise<{
      ok: boolean;
      error?: string;
      order?: OrderDetail;
      message?: string;
    }>,
  ) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      if (result.order) setOrder(result.order);
      setSuccess(result.message ?? "Saved.");
      router.refresh();
    });
  }

  function advance(to: OrderStatus) {
    if (to === "CANCELLED") {
      setConfirmAction({ kind: "cancel" });
      return;
    }
    if (to === "SHIPPED") {
      run(() =>
        adminUpdateOrderStatusAction({
          orderId: order.id,
          nextStatus: "SHIPPED",
          shippingProvider: provider,
          trackingNumber: tracking,
        }),
      );
      return;
    }
    run(() =>
      adminUpdateOrderStatusAction({
        orderId: order.id,
        nextStatus: to,
      }),
    );
  }

  const shipLines = [
    order.shippingAddress.fullName,
    order.shippingAddress.addressLine1,
    order.shippingAddress.addressLine2,
    [order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode]
      .filter(Boolean)
      .join(", "),
    order.shippingAddress.country,
    order.shippingAddress.phone,
  ].filter(Boolean);

  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: "order", label: "Order" },
    { id: "customer", label: "Customer" },
    { id: "activity", label: "Activity" },
    { id: "replacement", label: "Replacement" },
  ];

  return (
    <div className="space-y-5">
      {error ? (
        <p
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
          {success}
        </p>
      ) : null}

      <section className={`${adminCard()} ${adminCardPadding()}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Order overview
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
                {order.orderNumber}
              </h2>
              <AdminStatusBadge tone={statusTone(order.status)}>
                {orderStatusLabel(order.status)}
              </AdminStatusBadge>
              {order.payment ? (
                <AdminStatusBadge tone={paymentTone(order.payment.status)}>
                  Payment {order.payment.status}
                </AdminStatusBadge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Placed {formatDateTime(order.createdAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--color-muted)]">Grand total</p>
            <p className="text-2xl font-semibold tracking-tight">
              {formatMoney(order.grandTotal, order.currency)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)]">
              <PersonOutlineRoundedIcon className="!text-base" />
              Customer
            </p>
            <p className="mt-1 text-sm font-semibold">
              {order.customerName || "Customer"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)]">
              <Inventory2OutlinedIcon className="!text-base" />
              Items
            </p>
            <p className="mt-1 text-sm font-semibold">
              {order.items.length} line
              {order.items.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)]">
              <CreditCardOutlinedIcon className="!text-base" />
              Payment
            </p>
            <p className="mt-1 text-sm font-semibold capitalize">
              {order.payment?.provider === "cod"
                ? "Cash on Delivery"
                : order.payment?.provider === "razorpay"
                  ? "Razorpay"
                  : order.payment?.provider || "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight">
            Fulfillment progress
          </h2>
          <p className="text-xs text-[var(--color-muted)]">
            Tap the next step when ready
          </p>
        </div>
        <OrderStatusTimeline
          status={order.status}
          paymentProvider={order.payment?.provider}
        />
      </section>

      {hasRestrictedPolicy ? (
        <p className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <WarningAmberRoundedIcon className="mt-0.5 !text-base shrink-0" />
          <span>
            Restricted return policy on this order. Cash refund is blocked for
            “No return / no refund” or “Replace only” items.
          </span>
        </p>
      ) : null}

      <section className={`${adminCard()} overflow-hidden`}>
        <div
          className="flex flex-wrap border-b border-[var(--color-border)]"
          role="tablist"
          aria-label="Order detail sections"
        >
          {tabs.map((item) => {
            const selected = tab === item.id;
            const showReplaceBadge = item.id === "replacement" && replaceRequests.length > 0;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                id={`${tabsId}-tab-${item.id}`}
                aria-controls={`${tabsId}-panel-${item.id}`}
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold tracking-tight transition-colors sm:px-5",
                  selected
                    ? "border-b-2 border-[var(--color-primary)] text-[var(--color-foreground)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                {item.label}
                {showReplaceBadge ? (
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

        <div className={adminCardPadding()}>
          {tab === "order" ? (
            <div
              id={`${tabsId}-panel-order`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-tab-order`}
              className="grid gap-8 xl:grid-cols-[1.35fr_1fr]"
            >
              <div className="space-y-5">
                <section>
                  <SectionTitle
                    icon={<Inventory2OutlinedIcon className="!text-[1.1rem]" />}
                  >
                    Items ordered
                  </SectionTitle>
                  <ul className="mt-4 divide-y divide-[var(--color-border)]">
                    {order.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface)]">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.productName}
                              fill
                              unoptimized
                              className="object-contain p-1.5"
                              sizes="64px"
                            />
                          ) : (
                            <span className="flex h-full items-center justify-center text-sm font-semibold text-[var(--color-muted)]">
                              {item.productName.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[var(--color-foreground)]">
                            {item.productName}
                          </p>
                          <p className="text-xs text-[var(--color-muted)] sm:text-sm">
                            {[item.variantName, `Qty ${item.quantity}`, item.sku]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-amber-800">
                            {returnPolicyLabel(item.returnPolicy)}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">
                          {formatMoney(item.lineTotal, order.currency)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <SectionTitle
                    icon={<ReceiptLongOutlinedIcon className="!text-[1.1rem]" />}
                  >
                    Bill summary
                  </SectionTitle>
                  <dl className="mt-4 space-y-2 text-sm">
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
                      <div
                        key={String(label)}
                        className="flex justify-between gap-3"
                      >
                        <dt className="text-[var(--color-muted)]">{label}</dt>
                        <dd>{formatMoney(Number(value), order.currency)}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between gap-3 border-t border-[var(--color-border)] pt-3 text-base font-semibold">
                      <dt>Grand total</dt>
                      <dd>{formatMoney(order.grandTotal, order.currency)}</dd>
                    </div>
                  </dl>
                </section>

                <section>
                  <SectionTitle
                    icon={<CreditCardOutlinedIcon className="!text-[1.1rem]" />}
                  >
                    Payment
                  </SectionTitle>
                  {order.payment ? (
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--color-muted)]">Status</dt>
                        <dd>
                          <AdminStatusBadge
                            tone={paymentTone(order.payment.status)}
                          >
                            {order.payment.status}
                          </AdminStatusBadge>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--color-muted)]">Amount</dt>
                        <dd className="font-semibold">
                          {formatMoney(
                            order.payment.amount,
                            order.payment.currency,
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--color-muted)]">Provider</dt>
                        <dd>
                          {order.payment.provider === "cod"
                            ? "Cash on Delivery"
                            : order.payment.provider === "razorpay"
                              ? "Razorpay"
                              : order.payment.provider}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <dt className="text-[var(--color-muted)]">Method</dt>
                        <dd className="max-w-[12rem] text-right font-medium">
                          {order.payment.provider === "cod"
                            ? "Cash on Delivery"
                            : order.payment.instrument ||
                                order.payment.paymentMethod
                              ? [
                                  order.payment.instrument?.cardType
                                    ? `${order.payment.instrument.cardType} card`
                                    : order.payment.instrument?.method ||
                                      order.payment.paymentMethod,
                                  order.payment.instrument?.last4
                                    ? `****${order.payment.instrument.last4}`
                                    : null,
                                  order.payment.instrument?.vpa,
                                  order.payment.instrument?.bank,
                                  order.payment.instrument?.wallet,
                                  order.payment.instrument?.network,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")
                              : "—"}
                        </dd>
                      </div>
                      {order.payment.instrument?.vpa ? (
                        <div className="flex justify-between gap-2">
                          <dt className="text-[var(--color-muted)]">UPI ID</dt>
                          <dd className="max-w-[12rem] truncate text-xs">
                            {order.payment.instrument.vpa}
                          </dd>
                        </div>
                      ) : null}
                      {order.payment.instrument?.last4 ? (
                        <div className="flex justify-between gap-2">
                          <dt className="text-[var(--color-muted)]">Card</dt>
                          <dd className="text-xs font-medium tabular-nums">
                            {order.payment.instrument.cardType
                              ? `${order.payment.instrument.cardType} · `
                              : ""}
                            ****{order.payment.instrument.last4}
                            {order.payment.instrument.issuer
                              ? ` · ${order.payment.instrument.issuer}`
                              : ""}
                          </dd>
                        </div>
                      ) : null}
                      {order.payment.instrument?.bank &&
                      !order.payment.instrument.last4 ? (
                        <div className="flex justify-between gap-2">
                          <dt className="text-[var(--color-muted)]">Bank</dt>
                          <dd>{order.payment.instrument.bank}</dd>
                        </div>
                      ) : null}
                      {order.payment.instrument?.wallet ? (
                        <div className="flex justify-between gap-2">
                          <dt className="text-[var(--color-muted)]">Wallet</dt>
                          <dd>{order.payment.instrument.wallet}</dd>
                        </div>
                      ) : null}
                      {order.payment.providerPaymentId ? (
                        <div className="flex justify-between gap-2">
                          <dt className="text-[var(--color-muted)]">Payment ID</dt>
                          <dd className="max-w-[10rem] truncate text-xs">
                            {order.payment.providerPaymentId}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--color-muted)]">
                      No payment linked.
                    </p>
                  )}
                </section>
              </div>

              <div className="space-y-5 xl:border-l xl:border-[var(--color-border)] xl:pl-8">
                {canUpdate ? (
                  <section>
                    <SectionTitle
                      icon={
                        <CheckCircleOutlineRoundedIcon
                          className={cn(
                            "!text-[1.1rem]",
                            order.status === "DELIVERED" &&
                              "!text-[var(--color-success)]",
                          )}
                        />
                      }
                    >
                      Next step
                    </SectionTitle>
                    {primary && primaryAllowed ? (
                      <div className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))] p-4">
                        <p className="text-sm font-semibold text-[var(--color-foreground)]">
                          {primary.label}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {primary.hint}
                        </p>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => advance(primary.status)}
                          className={cn(adminBtn("primary"), "mt-4 w-full")}
                        >
                          {pending ? "Updating…" : primary.label}
                        </button>
                      </div>
                    ) : order.status === "DELIVERED" ? (
                      <p className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--color-success)_32%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-card))] px-3 py-3 text-sm font-medium text-[var(--color-success)]">
                        This order is complete.
                      </p>
                    ) : (
                      <p className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm text-[var(--color-muted)]">
                        {order.status === "CANCELLED" ||
                        order.status === "REFUNDED"
                          ? `No further fulfillment steps (${orderStatusLabel(order.status)}).`
                          : "No primary action available for this status."}
                      </p>
                    )}

                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                        Other actions
                      </p>
                      <div className="flex flex-col gap-2">
                        {canTransitionOrderStatus(order.status, "CANCELLED") ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setConfirmAction({ kind: "cancel" })}
                            className={cn(
                              adminBtn("outline"),
                              "w-full justify-start",
                            )}
                          >
                            Cancel order
                          </button>
                        ) : null}
                        {canRefund &&
                        canTransitionOrderStatus(order.status, "REFUNDED") ? (
                          <button
                            type="button"
                            disabled={pending || refundBlockedByPolicy}
                            onClick={() => setConfirmAction({ kind: "refund" })}
                            className={cn(
                              adminBtn("outline"),
                              "w-full justify-start text-red-700 disabled:opacity-40",
                            )}
                            title={
                              refundBlockedByPolicy
                                ? "Blocked by product return policy"
                                : undefined
                            }
                          >
                            {refundBlockedByPolicy
                              ? "Refund blocked (final sale)"
                              : "Mark refunded (local)"}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 border-t border-[var(--color-border)] pt-5">
                      <SectionTitle
                        icon={
                          <LocalShippingOutlinedIcon className="!text-[1.1rem]" />
                        }
                      >
                        Tracking
                      </SectionTitle>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        Optional. Add before or after marking shipped.
                      </p>
                      <div className="mt-3 space-y-2">
                        <input
                          value={provider}
                          onChange={(event) => setProvider(event.target.value)}
                          placeholder="Courier name (e.g. Delhivery)"
                          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-sm"
                        />
                        <input
                          value={tracking}
                          onChange={(event) => setTracking(event.target.value)}
                          placeholder="Tracking number"
                          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-sm"
                        />
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(() =>
                              adminUpdateOrderTrackingAction({
                                orderId: order.id,
                                shippingProvider: provider,
                                trackingNumber: tracking,
                              }),
                            )
                          }
                          className={cn(adminBtn("primary"), "w-full")}
                        >
                          Save tracking
                        </button>
                      </div>
                    </div>
                  </section>
                ) : (
                  <p className="text-sm text-[var(--color-muted)]">
                    You can view this order but cannot update fulfillment.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {tab === "customer" ? (
            <div
              id={`${tabsId}-panel-customer`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-tab-customer`}
              className="grid gap-8 md:grid-cols-2"
            >
              <section>
                <SectionTitle
                  icon={<PersonOutlineRoundedIcon className="!text-[1.1rem]" />}
                >
                  Customer
                </SectionTitle>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-[var(--color-muted)]">Name</dt>
                    <dd className="font-semibold">
                      {order.customerName ||
                        order.shippingAddress.fullName ||
                        "Customer"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--color-muted)]">Phone</dt>
                    <dd className="font-medium">
                      {order.shippingAddress.phone || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--color-muted)]">Email</dt>
                    <dd className="font-medium">
                      {order.customerEmail || "—"}
                    </dd>
                  </div>
                </dl>
              </section>
              <section className="md:border-l md:border-[var(--color-border)] md:pl-8">
                <SectionTitle
                  icon={<PlaceOutlinedIcon className="!text-[1.1rem]" />}
                >
                  Ship to
                </SectionTitle>
                <ul className="mt-3 space-y-1 text-sm leading-relaxed">
                  {shipLines.length ? (
                    shipLines.map((line) => <li key={line}>{line}</li>)
                  ) : (
                    <li className="text-[var(--color-muted)]">
                      No address on file.
                    </li>
                  )}
                </ul>
              </section>
            </div>
          ) : null}

          {tab === "activity" ? (
            <div
              id={`${tabsId}-panel-activity`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-tab-activity`}
            >
              <SectionTitle
                icon={<HistoryRoundedIcon className="!text-[1.1rem]" />}
              >
                Activity
              </SectionTitle>
              <AdminActivityTimeline activities={activitiesNewestFirst} />
            </div>
          ) : null}

          {tab === "replacement" ? (
            <div
              id={`${tabsId}-panel-replacement`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-tab-replacement`}
            >
              <SectionTitle
                icon={<ReplayOutlinedIcon className="!text-[1.1rem]" />}
              >
                Replacements
              </SectionTitle>
              {replaceRequests.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  No replacement requests for this order.
                </p>
              ) : (
                <ul className="mt-4 space-y-3 text-sm">
                  {replaceRequests.map((req) => (
                    <li
                      key={req.id}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{req.productName}</p>
                          <p className="text-[var(--color-muted)]">
                            Qty {req.quantity}
                          </p>
                          <p className="mt-1">{req.reason}</p>
                          <p className="mt-1 text-xs text-[var(--color-muted)]">
                            {replaceRequestStatusLabel(req.status)}
                          </p>
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
                      {canUpdate ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {req.status === "REQUESTED" ? (
                            <>
                              <button
                                type="button"
                                disabled={pending}
                                className={cn(adminBtn("primary"), "text-xs")}
                                onClick={() =>
                                  run(async () =>
                                    adminReviewReplaceRequestAction({
                                      requestId: req.id,
                                      orderId: order.id,
                                      nextStatus: "APPROVED",
                                    }),
                                  )
                                }
                              >
                                Grant request
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                className={cn(
                                  adminBtn("outline"),
                                  "text-xs text-red-700",
                                )}
                                onClick={() =>
                                  run(async () =>
                                    adminReviewReplaceRequestAction({
                                      requestId: req.id,
                                      orderId: order.id,
                                      nextStatus: "REJECTED",
                                      adminNote: "Not eligible for replacement",
                                    }),
                                  )
                                }
                              >
                                Reject
                              </button>
                            </>
                          ) : null}
                          {req.status === "APPROVED" ? (
                            <button
                              type="button"
                              disabled={pending}
                              className={cn(adminBtn("primary"), "text-xs")}
                              onClick={() =>
                                run(async () =>
                                  adminReviewReplaceRequestAction({
                                    requestId: req.id,
                                    orderId: order.id,
                                    nextStatus: "FULFILLED",
                                  }),
                                )
                              }
                            >
                              Mark replacement sent
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <ConfirmDeleteDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.kind === "refund"
            ? "Mark order refunded?"
            : "Cancel order?"
        }
        message={
          confirmAction?.kind === "refund"
            ? "Mark this order as refunded locally? This does not automatically refund via the payment provider."
            : "Cancel this order?"
        }
        confirmTone="danger"
        confirmLabel={
          confirmAction?.kind === "refund" ? "Mark refunded" : "Cancel order"
        }
        cancelLabel="Keep order"
        pending={pending}
        pendingLabel="Working…"
        onClose={() => {
          if (pending) return;
          setConfirmAction(null);
        }}
        onConfirm={() => {
          if (!confirmAction) return;
          const action = confirmAction;
          setConfirmAction(null);
          if (action.kind === "refund") {
            run(() => adminMarkOrderRefundedAction({ orderId: order.id }));
            return;
          }
          run(() =>
            adminUpdateOrderStatusAction({
              orderId: order.id,
              nextStatus: "CANCELLED",
            }),
          );
        }}
      />
    </div>
  );
}
