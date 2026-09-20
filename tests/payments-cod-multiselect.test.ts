import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateOrderPricing } from "@/features/pricing/engine";
import {
  paymentSettingsSchema,
  syncedPaymentProvider,
} from "@/features/admin/settings/shipping-payment-schemas";

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("Razorpay + COD multi-select payments", () => {
  it("accepts both methods enabled and syncs legacy provider", () => {
    const parsed = paymentSettingsSchema.safeParse({
      razorpayEnabled: true,
      codEnabled: true,
      feeEnabled: true,
      feeType: "FIXED",
      feeValue: 50,
      feeBasis: "SUBTOTAL_PLUS_SHIPPING",
      taxEnabled: false,
      taxType: "PERCENTAGE",
      taxValue: 0,
    });
    expect(parsed.success).toBe(true);
    expect(syncedPaymentProvider({ razorpayEnabled: true })).toBe("razorpay");
    expect(syncedPaymentProvider({ razorpayEnabled: false })).toBe("none");
  });

  it("admin form is multi-select Razorpay/COD without Other", () => {
    const form = read(
      "src/features/admin/settings/components/PaymentSettingsForm.tsx",
    );
    expect(form).toContain("Cash on Delivery");
    expect(form).toContain("razorpayEnabled");
    expect(form).toContain("codEnabled");
    expect(form).not.toMatch(/Other \(not set up yet\)|Reserved for another provider/);
    expect(form).toContain("Fee applies only for Razorpay");
  });

  it("checkout exposes method picker and COD place-order path", () => {
    const client = read(
      "src/features/checkout/components/CheckoutClient.tsx",
    );
    expect(client).toContain("placeCodOrderAction");
    expect(client).toContain("Cash on Delivery");
    expect(client).toContain("setCheckoutPaymentMethodAction");
    expect(client).toContain("Off (COD)");

    const session = read("src/features/payments/checkout-session.ts");
    expect(session).toContain('paymentMethod: "razorpay"');
    expect(session).toContain("razorpay_enabled");

    const cod = read("src/features/payments/cod-checkout.ts");
    expect(cod).toContain('provider: "cod"');
    expect(cod).toContain("finalizeCodOrder");
    expect(cod).toContain("paymentFee.minor !== 0");
  });

  it("payment fee is included for online pay and zero when fee disabled (COD)", () => {
    const withFee = calculateOrderPricing({
      currency: "INR",
      lines: [
        {
          productId: "p1",
          variantId: "v1",
          quantity: 1,
          unitPriceMinor: 100_000,
        },
      ],
      shipping: {
        enabled: true,
        method: "flat_rate",
        freeShippingThresholdMinor: null,
        defaultShippingFeeMinor: 5_000,
        percentageRate: null,
      },
      paymentFee: {
        enabled: true,
        feeType: "FIXED",
        feeValue: 5_000,
        feeBasis: "SUBTOTAL_PLUS_SHIPPING",
      },
      tax: { enabled: false, taxType: "PERCENTAGE", taxValue: 0 },
      discount: { amountMinor: 0 },
    });
    expect(withFee.ok).toBe(true);
    if (withFee.ok) {
      expect(withFee.pricing.paymentFee.minor).toBe(5_000);
      expect(withFee.pricing.grandTotal.minor).toBe(110_000);
    }

    const codStyle = calculateOrderPricing({
      currency: "INR",
      lines: [
        {
          productId: "p1",
          variantId: "v1",
          quantity: 1,
          unitPriceMinor: 100_000,
        },
      ],
      shipping: {
        enabled: true,
        method: "flat_rate",
        freeShippingThresholdMinor: null,
        defaultShippingFeeMinor: 5_000,
        percentageRate: null,
      },
      paymentFee: {
        enabled: false,
        feeType: "FIXED",
        feeValue: 5_000,
        feeBasis: "SUBTOTAL_PLUS_SHIPPING",
      },
      tax: { enabled: false, taxType: "PERCENTAGE", taxValue: 0 },
      discount: { amountMinor: 0 },
    });
    expect(codStyle.ok).toBe(true);
    if (codStyle.ok) {
      expect(codStyle.pricing.paymentFee.minor).toBe(0);
      expect(codStyle.pricing.grandTotal.minor).toBe(105_000);
    }
  });

  it("pricing service forces fee off for COD paymentMethod", () => {
    const service = read("src/features/pricing/service.ts");
    expect(service).toContain("paymentMethod");
    expect(service).toContain('params.paymentMethod !== "cod"');
  });

  it("migration adds razorpay_enabled and cod_enabled", () => {
    const sql = read(
      "supabase/migrations/20260920053000_payment_methods_razorpay_cod.sql",
    );
    expect(sql).toContain("razorpay_enabled");
    expect(sql).toContain("cod_enabled");
  });

  it("success page accepts pending COD payments", () => {
    const page = read("src/app/(storefront)/payment/success/page.tsx");
    expect(page).toContain('payment.provider === "cod"');
    expect(page).toContain('paymentMethod={isCod ? "cod" : "razorpay"}');
  });

  it("captures COD payment when order is delivered", () => {
    const admin = read("src/features/orders/admin-service.ts");
    expect(admin).toContain("captureCodPaymentOnDelivered");

    const capture = read("src/features/payments/cod-capture.ts");
    expect(capture).toContain('provider", "cod"');
    expect(capture).toContain('status: "CAPTURED"');
  });

  it("success view uses one primary CTA and text links", () => {
    const view = read(
      "src/features/payments/components/PaymentSuccessView.tsx",
    );
    expect(view).toContain("View my order");
    expect(view).toContain("/account/orders/${orderId}");
    expect(view).toContain("Download receipt");
    expect(view).toContain("Shop more");
  });
});
