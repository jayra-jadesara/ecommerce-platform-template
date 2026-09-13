"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createAddressAction } from "@/features/addresses/actions";
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
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

type CheckoutUiStep = "address" | "confirm" | "payment";

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

const STEPS: { id: CheckoutUiStep; label: string; hint: string }[] = [
  { id: "address", label: "Address", hint: "Delivery details" },
  { id: "confirm", label: "Confirm", hint: "Review order" },
  { id: "payment", label: "Payment", hint: "Pay securely" },
];

export function CheckoutClient({ initialSummary }: CheckoutClientProps) {
  const router = useRouter();
  const { openCheckout } = useRazorpayCheckout();
  const [summary, setSummary] = useState(initialSummary);
  const [couponInput, setCouponInput] = useState(
    initialSummary.couponCode ?? "",
  );
  const [showNewAddress, setShowNewAddress] = useState(
    initialSummary.addresses.length === 0,
  );
  const [uiStep, setUiStep] = useState<CheckoutUiStep>(() =>
    initialSummary.selectedAddressId && initialSummary.canProceed
      ? "confirm"
      : "address",
  );
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [pending, startTransition] = useTransition();

  const selectedAddress = useMemo(
    () =>
      summary.addresses.find((row) => row.id === summary.selectedAddressId) ??
      null,
    [summary.addresses, summary.selectedAddressId],
  );

  if (!summary.canProceed && summary.lines.length === 0) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-6 py-14 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Nothing to check out
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {summary.issues[0]?.message ?? "Your cart is empty."}
        </p>
        <Link href="/products" className={cn(sfBtn("primary"), "mt-6")}>
          Continue shopping
        </Link>
      </div>
    );
  }

  const ready = summary.step === "READY_FOR_PAYMENT";
  const busy = pending || paying;
  const stepIndex = STEPS.findIndex((s) => s.id === uiStep);

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
    <div className="grid gap-8 pb-28 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 lg:pb-0">
      <div className="space-y-6">
        <nav aria-label="Checkout progress" className="px-1 sm:px-4">
          <ol className="relative mx-auto flex max-w-xl items-start justify-between">
            {STEPS.map((step, index) => {
              const done = index < stepIndex;
              const active = step.id === uiStep;
              const connectorDone = index < stepIndex;
              return (
                <li
                  key={step.id}
                  className="relative z-[1] flex w-1/3 flex-col items-center text-center"
                >
                  {index < STEPS.length - 1 ? (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-[calc(50%+1.1rem)] top-[1.05rem] h-[2px] w-[calc(100%-2.2rem)]",
                        connectorDone
                          ? "bg-[var(--color-primary)]"
                          : "bg-[var(--color-border)]",
                      )}
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                      done
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                        : active
                          ? "border-[var(--color-primary)] bg-[var(--color-card)] text-[var(--color-primary)] ring-4 ring-[color-mix(in_srgb,var(--color-primary)_16%,transparent)]"
                          : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted)]",
                    )}
                    aria-current={active ? "step" : undefined}
                  >
                    {done ? (
                      <span aria-label="Completed">✓</span>
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "mt-2 text-sm font-semibold",
                      done || active
                        ? "text-[var(--color-foreground)]"
                        : "text-[var(--color-muted)]",
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="mt-0.5 hidden text-xs text-[var(--color-muted)] sm:block">
                    {done ? "Done" : step.hint}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        {summary.issues.length ? (
          <div
            className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            role="status"
          >
            <p className="text-sm font-medium">Cart updates</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-muted)]">
              {summary.issues.map((issue, index) => (
                <li key={`${issue.code}-${issue.cartItemId ?? index}`}>
                  {issue.message}
                  {issue.cartItemId && issue.code !== "QUANTITY_REDUCED" ? (
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
          <p
            className="rounded-xl border border-[color-mix(in_srgb,var(--color-error)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_8%,var(--color-card))] px-4 py-3 text-sm text-[var(--color-error)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {uiStep === "address" ? (
          <section
            aria-labelledby="checkout-address-heading"
            className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[0_12px_40px_color-mix(in_srgb,var(--color-foreground)_5%,transparent)] sm:p-6"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                  Delivery
                </p>
                <h2
                  id="checkout-address-heading"
                  className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold"
                >
                  Shipping address
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Choose a saved address or add a new one.
                </p>
              </div>
              <button
                type="button"
                disabled={!summary.canProceed || pending}
                onClick={() => setShowNewAddress((value) => !value)}
                className="text-sm font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline disabled:opacity-50"
              >
                {showNewAddress ? "Hide form" : "+ Add new address"}
              </button>
            </div>

            {!summary.canProceed ? (
              <p className="mt-4 text-sm text-[var(--color-muted)]">
                Resolve cart issues before selecting an address.
              </p>
            ) : null}

            {showNewAddress ? (
              <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-4 sm:p-5">
                <AddressForm
                  submitLabel="Save and continue"
                  onCancel={() => setShowNewAddress(false)}
                  onSubmit={async (values) => {
                    const result = await createAddressAction({
                      ...values,
                      isDefault:
                        values.isDefault || summary.addresses.length === 0,
                    });
                    if (!result.ok) return { ok: false, error: result.error };
                    if (!result.address) {
                      return {
                        ok: false,
                        error: "Address saved but could not be selected.",
                      };
                    }
                    const next = await selectCheckoutAddressAction({
                      addressId: result.address.id,
                      couponCode: summary.couponCode,
                    });
                    setSummary(next);
                    setShowNewAddress(false);
                    setUiStep("confirm");
                    return { ok: true };
                  }}
                />
              </div>
            ) : null}

            {summary.addresses.length === 0 && !showNewAddress ? (
              <p className="mt-5 text-sm text-[var(--color-muted)]">
                No saved addresses yet. Add one to continue.
              </p>
            ) : (
              <ul
                className="mt-5 space-y-3"
                role="radiogroup"
                aria-label="Saved addresses"
              >
                {summary.addresses.map((address) => {
                  const selected = summary.selectedAddressId === address.id;
                  return (
                    <li key={address.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-primary)]",
                          selected
                            ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))]"
                            : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]",
                        )}
                      >
                        <input
                          type="radio"
                          name="checkout-address"
                          className="mt-1 accent-[var(--color-primary)]"
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
                          <span className="block font-semibold">
                            {address.fullName}
                            {address.isDefault ? (
                              <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
                                Default
                              </span>
                            ) : null}
                          </span>
                          {address.phone ? (
                            <span className="mt-0.5 block text-sm text-[var(--color-muted)]">
                              {address.phone}
                            </span>
                          ) : null}
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

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!ready || busy}
                className={sfBtn("primary")}
                onClick={() => setUiStep("confirm")}
              >
                Continue to confirm
              </button>
              <Link href="/cart" className={sfBtn("outline")}>
                Back to cart
              </Link>
            </div>
          </section>
        ) : null}

        {uiStep === "confirm" ? (
          <section className="space-y-5 rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[0_12px_40px_color-mix(in_srgb,var(--color-foreground)_5%,transparent)] sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                Review
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
                Confirm details
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Check your items and delivery address before payment.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Order items</h3>
              <ul className="mt-3 space-y-3">
                {summary.lines.map((line) => (
                  <li
                    key={line.id}
                    className="flex gap-3 border-b border-[var(--color-border)] pb-3 last:border-0"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
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
                    </div>
                    <div className="text-right text-sm font-semibold">
                      {formatMoney(line.lineTotal, summary.currency)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {selectedAddress ? (
              <div className="rounded-2xl border-2 border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))] px-4 py-4 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                      Deliver to
                    </p>
                    <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
                      {selectedAddress.fullName}
                    </p>
                    {selectedAddress.phone ? (
                      <p className="mt-1 text-sm font-medium">
                        {selectedAddress.phone}
                      </p>
                    ) : null}
                    <div className="mt-3 space-y-0.5 text-sm leading-relaxed text-[var(--color-foreground)]">
                      <p>{selectedAddress.addressLine1}</p>
                      {selectedAddress.addressLine2 ? (
                        <p>{selectedAddress.addressLine2}</p>
                      ) : null}
                      <p>
                        {[
                          selectedAddress.city,
                          selectedAddress.state,
                          selectedAddress.postalCode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      <p>{selectedAddress.country}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-[var(--color-primary)] bg-[var(--color-card)] px-3 py-1.5 text-sm font-semibold text-[var(--color-primary)]"
                    onClick={() => setUiStep("address")}
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!ready || busy}
                className={sfBtn("primary")}
                onClick={() => setUiStep("payment")}
              >
                Continue to payment
              </button>
              <button
                type="button"
                className={sfBtn("outline")}
                onClick={() => setUiStep("address")}
              >
                Back
              </button>
            </div>
          </section>
        ) : null}

        {uiStep === "payment" ? (
          <section className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[0_12px_40px_color-mix(in_srgb,var(--color-foreground)_5%,transparent)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
              Secure checkout
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
              Payment
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-muted)]">
              You will complete payment in a secure window. Your order is only
              placed after payment succeeds.
            </p>
            {selectedAddress ? (
              <div className="mt-5 rounded-2xl border-2 border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))] px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                      Delivering to
                    </p>
                    <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-2xl">
                      {selectedAddress.fullName}
                    </p>
                    {selectedAddress.phone ? (
                      <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">
                        {selectedAddress.phone}
                      </p>
                    ) : null}
                    <div className="mt-3 space-y-0.5 text-sm leading-relaxed text-[var(--color-foreground)]">
                      <p>{selectedAddress.addressLine1}</p>
                      {selectedAddress.addressLine2 ? (
                        <p>{selectedAddress.addressLine2}</p>
                      ) : null}
                      <p>
                        {[
                          selectedAddress.city,
                          selectedAddress.state,
                          selectedAddress.postalCode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      <p>{selectedAddress.country}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-[var(--color-primary)] bg-[var(--color-card)] px-3 py-1.5 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))]"
                    onClick={() => setUiStep("address")}
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--color-error)]" role="alert">
                No delivery address selected. Go back and choose one.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!ready || busy || !selectedAddress}
                className={sfBtn("primary")}
                onClick={() => {
                  void handlePayNow();
                }}
              >
                {paying ? "Processing…" : "Pay now"}
              </button>
              <button
                type="button"
                className={sfBtn("outline")}
                onClick={() => setUiStep("confirm")}
              >
                Back
              </button>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="h-fit overflow-hidden rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_16px_48px_color-mix(in_srgb,var(--color-foreground)_6%,transparent)] lg:sticky lg:top-24">
        <div className="border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))] px-5 py-4">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Order summary
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Totals calculated securely
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <label htmlFor="checkout-coupon" className="text-sm font-medium">
              Coupon code
            </label>
            {summary.couponCode ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm">
                <span>
                  Applied: <strong>{summary.couponCode}</strong>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  className="font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline disabled:opacity-50"
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
                  className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-sm uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                  autoComplete="off"
                />
                <button
                  type="button"
                  disabled={
                    busy || !couponInput.trim() || summary.lines.length === 0
                  }
                  className={sfBtn("outline")}
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
              <p className="text-xs text-[var(--color-error)]" role="status">
                {summary.couponMessage}
              </p>
            ) : null}
          </div>

          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">Items</dt>
              <dd>{summary.itemCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">Subtotal</dt>
              <dd>
                {formatMoney(
                  summary.pricing?.subtotal.major ?? summary.subtotal,
                  summary.currency,
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">
                {summary.couponCode
                  ? `Coupon (${summary.couponCode})`
                  : "Discount"}
              </dt>
              <dd>
                −
                {formatMoney(
                  summary.pricing?.discount.major ?? 0,
                  summary.currency,
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">Shipping</dt>
              <dd>
                {summary.pricing
                  ? formatMoney(summary.pricing.shipping.major, summary.currency)
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">Payment fee</dt>
              <dd>
                {summary.pricing
                  ? formatMoney(
                      summary.pricing.paymentFee.major,
                      summary.currency,
                    )
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted)]">Tax</dt>
              <dd>
                {summary.pricing
                  ? formatMoney(summary.pricing.tax.major, summary.currency)
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-[var(--color-border)] pt-3 text-base font-semibold">
              <dt>Grand total</dt>
              <dd>
                {summary.pricing
                  ? formatMoney(
                      summary.pricing.grandTotal.major,
                      summary.currency,
                    )
                  : "—"}
              </dd>
            </div>
          </dl>

          {uiStep === "payment" ? (
            <button
              type="button"
              disabled={!ready || busy}
              onClick={() => {
                void handlePayNow();
              }}
              className={cn(sfBtn("primary"), "hidden w-full lg:inline-flex")}
            >
              {paying ? "Processing…" : "Pay now"}
            </button>
          ) : (
            <p className="text-center text-xs text-[var(--color-muted)]">
              Step {stepIndex + 1} of 3 — {STEPS[stepIndex]?.label}
            </p>
          )}
        </div>
      </aside>

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
          {uiStep === "address" ? (
            <button
              type="button"
              disabled={!ready || busy}
              className={sfBtn("primary")}
              onClick={() => setUiStep("confirm")}
            >
              Continue
            </button>
          ) : null}
          {uiStep === "confirm" ? (
            <button
              type="button"
              disabled={!ready || busy}
              className={sfBtn("primary")}
              onClick={() => setUiStep("payment")}
            >
              Payment
            </button>
          ) : null}
          {uiStep === "payment" ? (
            <button
              type="button"
              disabled={!ready || busy}
              className={sfBtn("primary")}
              onClick={() => {
                void handlePayNow();
              }}
            >
              {paying ? "Processing…" : "Pay now"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
