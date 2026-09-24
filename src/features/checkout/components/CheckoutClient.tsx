"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { StorefrontLoaderMark } from "@/components/ui/StorefrontLoaderMark";
import { usePlatformConfig } from "@/providers/PlatformConfigProvider";
import { createAddressAction } from "@/features/addresses/actions";
import { AddressForm } from "@/features/addresses/components/AddressForm";
import type { CustomerAddress } from "@/features/addresses/types";
import {
  applyCheckoutCouponAction,
  removeCheckoutCouponAction,
  removeCheckoutItemAction,
  selectCheckoutAddressAction,
  setCheckoutPaymentMethodAction,
} from "@/features/checkout/actions";
import type {
  CheckoutPaymentMethod,
  CheckoutSummary,
} from "@/features/checkout/types";
import { formatMoney } from "@/features/catalog/money";
import {
  cancelCheckoutPaymentAction,
  placeCodOrderAction,
  startCheckoutPaymentAction,
  verifyCheckoutPaymentAction,
} from "@/features/payments/actions";
import { useRazorpayCheckout } from "@/features/payments/components/useRazorpayCheckout";
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  DEFAULT_STORE_COUNTRY,
} from "@/lib/phone";

type CheckoutUiStep = "address" | "confirm" | "payment";
type PayOverlayPhase = "idle" | "opening" | "confirming" | "placing";

interface CheckoutClientProps {
  initialSummary: CheckoutSummary;
  featuredCoupon?: { code: string; offerLabel: string } | null;
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

export function CheckoutClient({
  initialSummary,
  featuredCoupon = null,
}: CheckoutClientProps) {
  const router = useRouter();
  const { ui, store, contact } = usePlatformConfig();
  const phoneCountryCode =
    store.phoneCountryCode ||
    contact.phoneCountryCode ||
    DEFAULT_PHONE_COUNTRY_CODE;
  const storeCountry = contact.country?.trim() || DEFAULT_STORE_COUNTRY;
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
  const [payPhase, setPayPhase] = useState<PayOverlayPhase>("idle");
  const [pending, startTransition] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod | null>(
    () =>
      initialSummary.selectedPaymentMethod ??
      initialSummary.enabledPaymentMethods[0] ??
      null,
  );
  const [overlayMounted, setOverlayMounted] = useState(false);

  useEffect(() => {
    setOverlayMounted(true);
  }, []);

  useEffect(() => {
    if (!(paying && (payPhase === "confirming" || payPhase === "placing"))) {
      return;
    }
    const scrollbarGap =
      window.innerWidth - document.documentElement.clientWidth;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [paying, payPhase]);
  const selectedAddress = useMemo(
    () =>
      summary.addresses.find((row) => row.id === summary.selectedAddressId) ??
      null,
    [summary.addresses, summary.selectedAddressId],
  );

  const enabledMethods = summary.enabledPaymentMethods;
  const activeMethod =
    paymentMethod && enabledMethods.includes(paymentMethod)
      ? paymentMethod
      : enabledMethods[0] ?? null;
  const hasPaymentMethods = enabledMethods.length > 0;

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

  function endPaying() {
    setPaying(false);
    setPayPhase("idle");
  }

  async function handlePayNow() {
    if (!ready || busy || !summary.selectedAddressId) return;
    if (activeMethod !== "razorpay") return;
    setError(null);
    setPaying(true);
    setPayPhase("opening");
    try {
      const started = await startCheckoutPaymentAction({
        addressId: summary.selectedAddressId,
        couponCode: summary.couponCode,
      });
      if (!started.ok) {
        setError(started.error);
        endPaying();
        return;
      }

      const session = started.session;
      await openCheckout({
        session,
        onSuccess: (payload) => {
          setPayPhase("confirming");
          startTransition(async () => {
            const verified = await verifyCheckoutPaymentAction({
              paymentId: session.paymentId,
              razorpayPaymentId: payload.razorpay_payment_id,
              razorpayOrderId: payload.razorpay_order_id,
              razorpaySignature: payload.razorpay_signature,
            });
            if (!verified.ok) {
              endPaying();
              setError(verified.error);
              router.push(
                `/payment/failed?paymentId=${encodeURIComponent(session.paymentId)}`,
              );
              return;
            }
            // Keep overlay up until navigation unmounts this page.
            router.push(
              `/payment/success?paymentId=${encodeURIComponent(session.paymentId)}&order=${encodeURIComponent(verified.orderNumber)}`,
            );
          });
        },
        onDismiss: () => {
          void cancelCheckoutPaymentAction({ paymentId: session.paymentId });
          endPaying();
          setError("Payment was cancelled. You can try again.");
        },
      });
    } catch {
      endPaying();
      setError("Unable to open payment. Please try again.");
    }
  }

  async function handlePlaceCodOrder() {
    if (!ready || busy || !summary.selectedAddressId) return;
    if (activeMethod !== "cod") return;
    setError(null);
    setPaying(true);
    setPayPhase("placing");
    startTransition(async () => {
      const placed = await placeCodOrderAction({
        addressId: summary.selectedAddressId,
        couponCode: summary.couponCode,
      });
      if (!placed.ok) {
        endPaying();
        setError(placed.error);
        return;
      }
      router.push(
        `/payment/success?paymentId=${encodeURIComponent(placed.paymentId)}&order=${encodeURIComponent(placed.orderNumber)}`,
      );
    });
  }

  function selectPaymentMethod(method: CheckoutPaymentMethod) {
    if (method === activeMethod || busy) return;
    setPaymentMethod(method);
    startTransition(async () => {
      setError(null);
      const next = await setCheckoutPaymentMethodAction({
        selectedAddressId: summary.selectedAddressId,
        couponCode: summary.couponCode,
        paymentMethod: method,
      });
      setSummary(next);
    });
  }

  function paymentCtaLabel() {
    if (payPhase === "confirming") return "Confirming…";
    if (payPhase === "placing") return "Placing order…";
    if (paying) return "Processing…";
    if (!hasPaymentMethods) return "Payments not set up";
    if (activeMethod === "cod") return "Place COD order";
    return "Pay online";
  }

  function runPaymentAction() {
    if (activeMethod === "cod") {
      void handlePlaceCodOrder();
      return;
    }
    void handlePayNow();
  }

  const showPayOverlay =
    paying && (payPhase === "confirming" || payPhase === "placing");

  const overlayCopy =
    payPhase === "placing"
      ? {
          title: "Placing your order",
          detail:
            "Please wait — don’t close this page or click away.",
        }
      : {
          title: "Confirming your payment",
          detail:
            "Confirming your online payment and preparing your order. Please wait — don’t close this page or click away.",
        };

  const payOverlay =
    showPayOverlay && overlayMounted
      ? createPortal(
          <div
            className="sf-checkout-pay-overlay fixed inset-0 z-[300] flex items-center justify-center bg-[color-mix(in_srgb,var(--color-foreground)_45%,transparent)] p-4 backdrop-blur-[2px]"
            role="alertdialog"
            aria-modal="true"
            aria-busy="true"
            aria-labelledby="checkout-pay-overlay-title"
            aria-describedby="checkout-pay-overlay-detail"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") event.preventDefault();
            }}
          >
            <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-8 text-center shadow-[0_24px_60px_color-mix(in_srgb,var(--color-foreground)_18%,transparent)]">
              <StorefrontLoaderMark style={ui.loaderStyle} size={36} />
              <p
                id="checkout-pay-overlay-title"
                className="mt-4 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-foreground)]"
              >
                {overlayCopy.title}
              </p>
              <p
                id="checkout-pay-overlay-detail"
                className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]"
              >
                {overlayCopy.detail}
              </p>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="grid gap-8 pb-28 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 lg:pb-0">
      {payOverlay}
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
                              paymentMethod: activeMethod,
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
                  phoneCountryCode={phoneCountryCode}
                  storeCountry={storeCountry}
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
                      paymentMethod: activeMethod,
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
                                paymentMethod: activeMethod,
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

            <Link
              href="/cart"
              className="mt-5 inline-block text-xs font-semibold text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
            >
              ← Back to cart
            </Link>
          </section>
        ) : null}

        {uiStep === "confirm" ? (
          <section className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[0_8px_28px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)] sm:p-5">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                Confirm details
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                Check items and delivery before payment.
              </p>
            </div>

            <div>
              <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Items · {summary.lines.length}
              </h3>
              <ul className="mt-2 divide-y divide-[var(--color-border)]">
                {summary.lines.map((line) => (
                  <li key={line.id} className="flex items-center gap-2.5 py-2.5 first:pt-1 last:pb-0">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                      {line.imageUrl ? (
                        <Image
                          src={line.imageUrl}
                          alt={line.imageAlt}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="44px"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[10px] text-[var(--color-muted)]">
                          —
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-snug">
                        {line.productName}
                      </p>
                      <p className="truncate text-[11px] text-[var(--color-muted)]">
                        {line.variantName} · Qty {line.quantity}
                      </p>
                    </div>
                    <div className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatMoney(line.lineTotal, summary.currency)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {selectedAddress ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      Deliver to
                    </p>
                    <p className="mt-1 text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
                      {selectedAddress.fullName}
                      {selectedAddress.phone ? (
                        <span className="font-normal text-[var(--color-muted)]">
                          {" "}
                          · {selectedAddress.phone}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
                      {[
                        selectedAddress.addressLine1,
                        selectedAddress.addressLine2,
                        [
                          selectedAddress.city,
                          selectedAddress.state,
                          selectedAddress.postalCode,
                        ]
                          .filter(Boolean)
                          .join(", "),
                        selectedAddress.country,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
                    onClick={() => setUiStep("address")}
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              className="text-xs font-semibold text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
              onClick={() => setUiStep("address")}
            >
              ← Back to address
            </button>
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
              {hasPaymentMethods
                ? "Choose how you want to pay. Totals update when you switch."
                : "This store has no payment methods enabled yet. Please contact the store."}
            </p>

            {hasPaymentMethods ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {enabledMethods.includes("razorpay") ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => selectPaymentMethod("razorpay")}
                    className={cn(
                      "rounded-2xl border px-4 py-4 text-left transition-colors",
                      activeMethod === "razorpay"
                        ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))] shadow-[0_0_0_1px_var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-card)]",
                    )}
                  >
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">
                      Online payment
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
                      Pay online with card or UPI. Order is placed after payment
                      succeeds.
                    </p>
                  </button>
                ) : null}
                {enabledMethods.includes("cod") ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => selectPaymentMethod("cod")}
                    className={cn(
                      "rounded-2xl border px-4 py-4 text-left transition-colors",
                      activeMethod === "cod"
                        ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))] shadow-[0_0_0_1px_var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-card)]",
                    )}
                  >
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">
                      Cash on Delivery
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
                      Place the order now. Pay cash when it is delivered. No
                      online payment fee.
                    </p>
                  </button>
                ) : null}
              </div>
            ) : null}

            {selectedAddress ? (
              <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      Delivering to
                    </p>
                    <p className="mt-1 text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
                      {selectedAddress.fullName}
                      {selectedAddress.phone ? (
                        <span className="font-normal text-[var(--color-muted)]">
                          {" "}
                          · {selectedAddress.phone}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
                      {[
                        selectedAddress.addressLine1,
                        selectedAddress.addressLine2,
                        [
                          selectedAddress.city,
                          selectedAddress.state,
                          selectedAddress.postalCode,
                        ]
                          .filter(Boolean)
                          .join(", "),
                        selectedAddress.country,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
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
            <button
              type="button"
              className="mt-4 text-xs font-semibold text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
              onClick={() => setUiStep("confirm")}
            >
              ← Back to confirm
            </button>
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
            {!summary.couponCode && featuredCoupon ? (
              <button
                type="button"
                disabled={busy || summary.lines.length === 0}
                onClick={() => {
                  const code = featuredCoupon.code;
                  setCouponInput(code);
                  startTransition(async () => {
                    setError(null);
                    const next = await applyCheckoutCouponAction({
                      code,
                      selectedAddressId: summary.selectedAddressId,
                      paymentMethod: activeMethod,
                    });
                    setSummary(next);
                    if (next.couponCode) {
                      setCouponInput(next.couponCode);
                    }
                  });
                }}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))] px-3 py-2.5 text-left text-sm transition hover:border-[var(--color-primary)] disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                    Try {featuredCoupon.offerLabel}
                  </span>
                  <span className="font-semibold tracking-wide">
                    {featuredCoupon.code}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-[var(--color-primary)]">
                  Apply
                </span>
              </button>
            ) : null}
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
                        paymentMethod: activeMethod,
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
                        paymentMethod: activeMethod,
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
                  ? summary.pricing.paymentFee.major > 0
                    ? formatMoney(
                        summary.pricing.paymentFee.major,
                        summary.currency,
                      )
                    : activeMethod === "cod"
                      ? "Off (COD)"
                      : formatMoney(0, summary.currency)
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

          {uiStep === "address" ? (
            <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
              <button
                type="button"
                disabled={!ready || busy}
                onClick={() => setUiStep("confirm")}
                className={cn(
                  sfBtn("primary"),
                  "hidden w-full !min-h-10 !text-sm lg:inline-flex",
                )}
              >
                Continue to confirm
              </button>
              <p className="text-center text-[11px] text-[var(--color-muted)]">
                Step {stepIndex + 1} of 3 — {STEPS[stepIndex]?.label}
              </p>
            </div>
          ) : uiStep === "confirm" ? (
            <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
              <button
                type="button"
                disabled={!ready || busy}
                onClick={() => setUiStep("payment")}
                className={cn(
                  sfBtn("primary"),
                  "hidden w-full !min-h-10 !text-sm lg:inline-flex",
                )}
              >
                Continue to payment
              </button>
              <p className="text-center text-[11px] text-[var(--color-muted)]">
                Step {stepIndex + 1} of 3 — {STEPS[stepIndex]?.label}
              </p>
            </div>
          ) : uiStep === "payment" ? (
            <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
              <button
                type="button"
                disabled={
                  !ready || busy || !selectedAddress || !hasPaymentMethods
                }
                onClick={runPaymentAction}
                className={cn(
                  sfBtn("primary"),
                  "hidden w-full !min-h-10 !text-sm lg:inline-flex",
                )}
              >
                {paymentCtaLabel()}
              </button>
              <p className="text-center text-[11px] text-[var(--color-muted)]">
                Step {stepIndex + 1} of 3 — {STEPS[stepIndex]?.label}
              </p>
            </div>
          ) : (
            <p className="border-t border-[var(--color-border)] pt-4 text-center text-xs text-[var(--color-muted)]">
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
              disabled={!ready || busy || !hasPaymentMethods}
              className={sfBtn("primary")}
              onClick={runPaymentAction}
            >
              {paymentCtaLabel()}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
