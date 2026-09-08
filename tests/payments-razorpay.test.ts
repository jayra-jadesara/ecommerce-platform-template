import { describe, expect, it } from "vitest";
import {
  canTransitionPaymentStatus,
  preferPaymentStatus,
} from "@/features/payments/state-machine";
import {
  computeRazorpayCheckoutSignature,
  computeRazorpayWebhookSignature,
  verifyRazorpayCheckoutSignaturePure,
  verifyRazorpayWebhookSignaturePure,
} from "@/features/payments/providers/razorpay-crypto";
import { majorToMinor, minorToMajor } from "@/features/pricing/money";
import { calculateOrderPricing } from "@/features/pricing/engine";
import { deriveCheckoutStep } from "@/features/checkout/types";

describe("payment state machine", () => {
  it("allows forward transitions only", () => {
    expect(canTransitionPaymentStatus("CREATED", "PENDING")).toBe(true);
    expect(canTransitionPaymentStatus("PENDING", "CAPTURED")).toBe(true);
    expect(canTransitionPaymentStatus("AUTHORIZED", "CAPTURED")).toBe(true);
    expect(canTransitionPaymentStatus("CAPTURED", "REFUNDED")).toBe(true);
    expect(canTransitionPaymentStatus("CAPTURED", "AUTHORIZED")).toBe(false);
    expect(canTransitionPaymentStatus("CAPTURED", "PENDING")).toBe(false);
    expect(canTransitionPaymentStatus("FAILED", "CAPTURED")).toBe(false);
  });

  it("does not downgrade when preferring statuses", () => {
    expect(preferPaymentStatus("CAPTURED", "AUTHORIZED")).toBe("CAPTURED");
    expect(preferPaymentStatus("AUTHORIZED", "CAPTURED")).toBe("CAPTURED");
    expect(preferPaymentStatus("PENDING", "FAILED")).toBe("FAILED");
  });
});

describe("razorpay signatures", () => {
  const secret = "test_secret_key";

  it("verifies checkout HMAC success and rejects mismatch", () => {
    const orderId = "order_ABC";
    const paymentId = "pay_XYZ";
    const signature = computeRazorpayCheckoutSignature(
      orderId,
      paymentId,
      secret,
    );
    expect(
      verifyRazorpayCheckoutSignaturePure({
        orderId,
        paymentId,
        signature,
        secret,
      }),
    ).toBe(true);
    expect(
      verifyRazorpayCheckoutSignaturePure({
        orderId,
        paymentId,
        signature: "deadbeef",
        secret,
      }),
    ).toBe(false);
    expect(
      verifyRazorpayCheckoutSignaturePure({
        orderId: "order_OTHER",
        paymentId,
        signature,
        secret,
      }),
    ).toBe(false);
  });

  it("verifies webhook HMAC over raw body", () => {
    const rawBody = JSON.stringify({
      event: "payment.captured",
      id: "evt_1",
    });
    const signature = computeRazorpayWebhookSignature(rawBody, secret);
    expect(
      verifyRazorpayWebhookSignaturePure({ rawBody, signature, secret }),
    ).toBe(true);
    expect(
      verifyRazorpayWebhookSignaturePure({
        rawBody: `${rawBody} `,
        signature,
        secret,
      }),
    ).toBe(false);
  });
});

describe("razorpay amount subunits from pricing engine", () => {
  it("passes grand total minor units consistently", () => {
    const outcome = calculateOrderPricing({
      currency: "INR",
      lines: [
        {
          productId: "p1",
          variantId: "v1",
          quantity: 2,
          unitPriceMinor: majorToMinor(100, "INR"),
        },
      ],
      shipping: {
        enabled: true,
        method: "flat_rate",
        freeShippingThresholdMinor: null,
        defaultShippingFeeMinor: majorToMinor(50, "INR"),
        percentageRate: null,
      },
      paymentFee: {
        enabled: true,
        feeType: "PERCENTAGE",
        feeValue: 2,
        feeBasis: "SUBTOTAL_PLUS_SHIPPING",
      },
      tax: { enabled: false, taxType: "PERCENTAGE", taxValue: 0 },
      discount: { amountMinor: 0 },
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const minor = outcome.pricing.grandTotal.minor;
    expect(Number.isInteger(minor)).toBe(true);
    expect(minor).toBe(majorToMinor(outcome.pricing.grandTotal.major, "INR"));
    expect(minorToMajor(minor, "INR")).toBe(outcome.pricing.grandTotal.major);

    // Razorpay order amount must equal this integer minor total.
    const razorpayAmount = minor;
    expect(razorpayAmount).toBe(outcome.pricing.grandTotal.minor);
  });

  it("rejects floating comparisons for amount mismatch detection", () => {
    const expected = majorToMinor(0.1 + 0.2, "INR");
    // Float drift: 0.1+0.2 is not exactly 0.3 in IEEE-754.
    expect(0.1 + 0.2 === 0.3).toBe(false);
    expect(expected).toBe(majorToMinor(0.3, "INR"));
  });
});

describe("checkout step readiness for payment", () => {
  it("keeps READY_FOR_PAYMENT as the gate before Pay Now", () => {
    expect(
      deriveCheckoutStep({ canProceed: true, selectedAddressId: "addr" }),
    ).toBe("READY_FOR_PAYMENT");
    expect(
      deriveCheckoutStep({ canProceed: false, selectedAddressId: "addr" }),
    ).toBe("CART_REVIEW");
  });
});
