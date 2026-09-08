"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createAddressAction,
} from "@/features/addresses/actions";
import { AddressForm } from "@/features/addresses/components/AddressForm";
import type { CustomerAddress } from "@/features/addresses/types";
import {
  applyCheckoutCouponAction,
  removeCheckoutCouponAction,
  removeCheckoutItemAction,
  selectCheckoutAddressAction,
} from "@/features/checkout/actions";
import type { CheckoutSummary } from "@/features/checkout/types";
import { formatMoney } from "@/features/catalog/money";
import {
  cancelCheckoutPaymentAction,
  startCheckoutPaymentAction,
  verifyCheckoutPaymentAction,
} from "@/features/payments/actions";
import { useRazorpayCheckout } from "@/features/payments/components/useRazorpayCheckout";

interface CheckoutClientProps {
  initialSummary: CheckoutSummary;
}

function formatAddress(address: CustomerAddress): string {
  return [
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    address.country,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function CheckoutClient({ initialSummary }: CheckoutClientProps) {
  const router = useRouter();
  const { openCheckout } = useRazorpayCheckout();
  const [summary, setSummary] = useState(initialSummary);
  const [couponInput, setCouponInput] = useState(
    initialSummary.couponCode ?? "",
  );
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!summary.canProceed && summary.lines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-12 text-center">
        <h2 className="text-xl font-semibold">Nothing to check out</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {summary.issues[0]?.message ?? "Your cart is empty."}
        </p>
        <Link
          href="/products"
          className="mt-4 inline-flex rounded-md bg-[var(--color-button-background)] px-4 py-2 text-sm font-medium text-[var(--color-button-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const ready = summary.step === "READY_FOR_PAYMENT";
  const busy = pending || paying;

  async function handlePayNow() {
    if (!ready || busy || !summary.selectedAddressId) return;
    setError(null);
    setPaying(true);
    try {
      const started = await startCheckoutPaymentAction({
        addressId: summary.selectedAddressId,
        couponCode: summary.couponCode,
      });
      if (!started.ok) {
        setError(started.error);
        setPaying(false);
        return;
      }

      const session = started.session;
      await openCheckout({
        session,
        onSuccess: (payload) => {
          startTransition(async () => {
            const verified = await verifyCheckoutPaymentAction({
              paymentId: session.paymentId,
              razorpayPaymentId: payload.razorpay_payment_id,
              razorpayOrderId: payload.razorpay_order_id,
              razorpaySignature: payload.razorpay_signature,
            });
            setPaying(false);
            if (!verified.ok) {
              setError(verified.error);
              router.push(
                `/payment/failed?paymentId=${encodeURIComponent(session.paymentId)}`,
              );
              return;
            }
            router.push(
              `/payment/success?paymentId=${encodeURIComponent(session.paymentId)}&order=${encodeURIComponent(verified.orderNumber)}`,
            );
          });
        },
        onDismiss: () => {
          void cancelCheckoutPaymentAction({ paymentId: session.paymentId });
          setPaying(false);
          setError("Payment was cancelled. You can try again.");
        },
      });
    } catch {
      setPaying(false);
      setError("Unable to open payment. Please try again.");
    }
  }

  return (
    <div className="grid gap-8 pb-24 lg:grid-cols-[1fr_340px] lg:pb-0">
      <div className="space-y-6">
        {summary.issues.length ? (
          <div
            className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            role="status"
          >
            <p className="text-sm font-medium">Cart updates</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-muted)]">
              {summary.issues.map((issue, index) => (
                <li key={`${issue.code}-${issue.cartItemId ?? index}`}>
                  {issue.message}
                  {issue.cartItemId &&
                  issue.code !== "QUANTITY_REDUCED" ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        disabled={pending}
                        className="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                        onClick={() => {
                          startTransition(async () => {
                            const next = await removeCheckoutItemAction({
                              cartItemId: issue.cartItemId!,
                              couponCode: summary.couponCode,
                            });
                            setSummary(next);
                          });
                        }}
                      >
                        Remove item
                      </button>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <section aria-labelledby="checkout-items-heading">
          <h2 id="checkout-items-heading" className="font-semibold">
            Order items
          </h2>
          <ul className="mt-3 space-y-3">
            {summary.lines.map((line) => (
              <li
                key={line.id}
                className="flex gap-3 border-b border-[var(--color-border)] pb-3"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                  {line.imageUrl ? (
                    <Image
                      src={line.imageUrl}
                      alt={line.imageAlt}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{line.productName}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {line.variantName} · Qty {line.quantity}
                  </p>
                  {line.availability !== "AVAILABLE" ? (
                    <p className="text-sm text-red-700">Unavailable</p>
                  ) : null}
                </div>
                <div className="text-right text-sm">
                  <p>{formatMoney(line.currentUnitPrice, summary.currency)}</p>
                  <p className="font-semibold">
                    {formatMoney(line.lineTotal, summary.currency)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="checkout-address-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="checkout-address-heading" className="font-semibold">
              Shipping address
            </h2>
            <button
              type="button"
              disabled={!summary.canProceed || pending}
              onClick={() => setShowNewAddress((value) => !value)}
              className="text-sm font-medium underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-50"
            >
              {showNewAddress ? "Hide form" : "+ Add new address"}
            </button>
          </div>

          {!summary.canProceed ? (
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Resolve cart issues before selecting an address.
            </p>
          ) : null}

          {showNewAddress ? (
            <div className="mt-3 rounded-xl border border-[var(--color-border)] p-4">
              <AddressForm
                submitLabel="Save and select"
                onCancel={() => setShowNewAddress(false)}
                onSubmit={async (values) => {
                  const result = await createAddressAction({
                    ...values,
                    isDefault: values.isDefault || summary.addresses.length === 0,
                  });
                  if (!result.ok) return { ok: false, error: result.error };
                  if (!result.address) {
                    return { ok: false, error: "Address saved but could not be selected." };
                  }
                  const next = await selectCheckoutAddressAction({
                    addressId: result.address.id,
                    couponCode: summary.couponCode,
                  });
                  setSummary(next);
                  setShowNewAddress(false);
                  return { ok: true };
                }}
              />
            </div>
          ) : null}

          {summary.addresses.length === 0 && !showNewAddress ? (
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              No saved addresses yet. Add one to continue.
            </p>
          ) : (
            <ul className="mt-3 space-y-2" role="radiogroup" aria-label="Saved addresses">
              {summary.addresses.map((address) => {
                const selected = summary.selectedAddressId === address.id;
                return (
                  <li key={address.id}>
                    <label
                      className={`flex cursor-pointer gap-3 rounded-xl border p-4 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-primary)] ${
                        selected
                          ? "border-[var(--color-primary)] bg-[var(--color-surface)]"
                          : "border-[var(--color-border)] bg-[var(--color-card)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="checkout-address"
                        className="mt-1"
                        checked={selected}
                        disabled={!summary.canProceed || pending}
                        onChange={() => {
                          startTransition(async () => {
                            setError(null);
                            const next = await selectCheckoutAddressAction({
                              addressId: address.id,
                              couponCode: summary.couponCode,
                            });
                            setSummary(next);
                          });
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">
                          {address.fullName}
                          {address.isDefault ? (
                            <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
                              Default
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-sm text-[var(--color-muted)]">
                          {formatAddress(address)}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <aside className="h-fit rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 lg:sticky lg:top-4">
        <h2 className="font-semibold">Checkout summary</h2>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Totals from the server pricing engine.
        </p>

        <div className="mt-4 space-y-2">
          <label htmlFor="checkout-coupon" className="text-sm font-medium">
            Coupon code
          </label>
          {summary.couponCode ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
              <span>
                Applied: <strong>{summary.couponCode}</strong>
              </span>
              <button
                type="button"
                disabled={busy}
                className="underline disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    setError(null);
                    const next = await removeCheckoutCouponAction({
                      selectedAddressId: summary.selectedAddressId,
                    });
                    setSummary(next);
                    setCouponInput("");
                  });
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                id="checkout-coupon"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                disabled={busy || summary.lines.length === 0}
                placeholder="Enter code"
                className="min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                autoComplete="off"
              />
              <button
                type="button"
                disabled={busy || !couponInput.trim() || summary.lines.length === 0}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    setError(null);
                    const next = await applyCheckoutCouponAction({
                      code: couponInput,
                      selectedAddressId: summary.selectedAddressId,
                    });
                    setSummary(next);
                    if (next.couponCode) {
                      setCouponInput(next.couponCode);
                    }
                  });
                }}
              >
                Apply
              </button>
            </div>
          )}
          {summary.couponMessage ? (
            <p className="text-xs text-red-700" role="status">
              {summary.couponMessage}
            </p>
          ) : null}
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Items</dt>
            <dd>{summary.itemCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>
              {formatMoney(
                summary.pricing?.subtotal.major ?? summary.subtotal,
                summary.currency,
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>
              {summary.couponCode
                ? `Coupon (${summary.couponCode})`
                : "Discount"}
            </dt>
            <dd>
              −
              {formatMoney(summary.pricing?.discount.major ?? 0, summary.currency)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>
              {summary.pricing
                ? formatMoney(summary.pricing.shipping.major, summary.currency)
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Payment fee</dt>
            <dd>
              {summary.pricing
                ? formatMoney(summary.pricing.paymentFee.major, summary.currency)
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Tax</dt>
            <dd>
              {summary.pricing
                ? formatMoney(summary.pricing.tax.major, summary.currency)
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Grand total</dt>
            <dd>
              {summary.pricing
                ? formatMoney(summary.pricing.grandTotal.major, summary.currency)
                : "—"}
            </dd>
          </div>
        </dl>

        {summary.pricing?.shippingRule.freeShippingApplied ? (
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Free shipping threshold applied.
          </p>
        ) : null}

        <p className="mt-4 text-xs text-[var(--color-muted)]">
          Step:{" "}
          {summary.step === "CART_REVIEW"
            ? "Review cart"
            : summary.step === "ADDRESS_SELECTION"
              ? "Select address"
              : paying
                ? "Processing payment"
                : "Ready for payment"}
        </p>

        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => {
            void handlePayNow();
          }}
          title={
            ready
              ? "Pay securely"
              : "Select a valid address and resolve cart issues"
          }
          className="mt-4 hidden min-h-11 w-full items-center justify-center rounded-md bg-[var(--color-button-background)] px-4 py-2.5 text-sm font-medium text-[var(--color-button-foreground)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] lg:flex"
        >
          {paying ? "Processing…" : "Pay Now"}
        </button>
        <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
          You will complete payment in a secure checkout window.
        </p>
        <Link
          href="/cart"
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-md border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          Back to cart
        </Link>
      </aside>

      {/* Mobile sticky Pay Now */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-card)_94%,transparent)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--color-muted)]">Total</p>
            <p className="truncate text-base font-semibold">
              {formatMoney(
                summary.pricing?.grandTotal.major ?? summary.subtotal,
                summary.currency,
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={!ready || busy}
            onClick={() => {
              void handlePayNow();
            }}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-[var(--color-button-background)] px-4 text-sm font-medium text-[var(--color-button-foreground)] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {paying ? "Processing…" : "Pay Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
