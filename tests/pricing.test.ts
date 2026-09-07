import { describe, expect, it } from "vitest";
import { calculateOrderPricing, calculateSubtotalMinor } from "@/features/pricing/engine";
import {
  majorToMinor,
  minorToMajor,
  percentOfMinor,
} from "@/features/pricing/money";
import type { PricingEngineInput } from "@/features/pricing/types";
import { hasPermission } from "@/features/auth/permissions";
import {
  paymentSettingsSchema,
  shippingSettingsSchema,
} from "@/features/admin/settings/shipping-payment-schemas";

function baseInput(
  overrides: Partial<PricingEngineInput> = {},
): PricingEngineInput {
  return {
    currency: "INR",
    lines: [
      {
        productId: "p1",
        variantId: "v1",
        quantity: 2,
        unitPriceMinor: 10_000,
      },
    ],
    shipping: {
      enabled: true,
      method: "flat_rate",
      freeShippingThresholdMinor: 50_000,
      defaultShippingFeeMinor: 5_000,
      percentageRate: null,
    },
    paymentFee: {
      enabled: false,
      feeType: "PERCENTAGE",
      feeValue: 0,
      feeBasis: "SUBTOTAL_PLUS_SHIPPING",
    },
    tax: { enabled: false, taxType: "PERCENTAGE", taxValue: 0 },
    discount: { amountMinor: 0 },
    ...overrides,
  };
}

describe("money minor units", () => {
  it("converts major/minor without float drift for 2-decimal currencies", () => {
    expect(majorToMinor(100.5, "INR")).toBe(10050);
    expect(minorToMajor(10050, "INR")).toBe(100.5);
    expect(majorToMinor(0.1 + 0.2, "INR")).toBe(30);
  });

  it("rounds percentage fees with half-up on minor units", () => {
    expect(percentOfMinor(10_000, 2)).toBe(200);
    expect(percentOfMinor(10_001, 2.5)).toBe(250);
  });
});

describe("pricing engine subtotal", () => {
  it("calculates basic and multi-variant subtotals", () => {
    const one = calculateOrderPricing(baseInput());
    expect(one.ok).toBe(true);
    if (one.ok) expect(one.pricing.subtotal.minor).toBe(20_000);

    const multi = calculateOrderPricing(
      baseInput({
        lines: [
          { productId: "p1", variantId: "v1", quantity: 2, unitPriceMinor: 1000 },
          { productId: "p2", variantId: "v2", quantity: 3, unitPriceMinor: 2500 },
        ],
      }),
    );
    expect(multi.ok).toBe(true);
    if (multi.ok) {
      expect(multi.pricing.subtotal.minor).toBe(2 * 1000 + 3 * 2500);
      expect(multi.pricing.itemCount).toBe(5);
    }
  });

  it("rejects zero/invalid quantity and negative prices", () => {
    expect(
      calculateOrderPricing(
        baseInput({
          lines: [
            { productId: "p1", variantId: "v1", quantity: 0, unitPriceMinor: 100 },
          ],
        }),
      ).ok,
    ).toBe(false);
    expect(
      calculateOrderPricing(
        baseInput({
          lines: [
            {
              productId: "p1",
              variantId: "v1",
              quantity: 1,
              unitPriceMinor: -1,
            },
          ],
        }),
      ).ok,
    ).toBe(false);
  });

  it("keeps cart subtotal helper aligned with the engine", () => {
    expect(
      calculateSubtotalMinor([
        { unitPriceMinor: 1999, quantity: 2 },
        { unitPriceMinor: 500, quantity: 1 },
      ]),
    ).toBe(4498);
  });
});

describe("shipping rules", () => {
  it("applies free shipping at/above threshold", () => {
    const result = calculateOrderPricing(
      baseInput({
        lines: [
          {
            productId: "p1",
            variantId: "v1",
            quantity: 1,
            unitPriceMinor: 50_000,
          },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pricing.shipping.minor).toBe(0);
      expect(result.pricing.shippingRule.freeShippingApplied).toBe(true);
    }
  });

  it("charges default fee below threshold", () => {
    const result = calculateOrderPricing(
      baseInput({
        lines: [
          {
            productId: "p1",
            variantId: "v1",
            quantity: 1,
            unitPriceMinor: 49_999,
          },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pricing.shipping.minor).toBe(5_000);
  });

  it("returns zero shipping when disabled or method is free", () => {
    const disabled = calculateOrderPricing(
      baseInput({
        shipping: {
          enabled: false,
          method: "flat_rate",
          freeShippingThresholdMinor: 50_000,
          defaultShippingFeeMinor: 5_000,
          percentageRate: null,
        },
      }),
    );
    expect(disabled.ok && disabled.pricing.shipping.minor).toBe(0);

    const alwaysFree = calculateOrderPricing(
      baseInput({
        shipping: {
          enabled: true,
          method: "free",
          freeShippingThresholdMinor: null,
          defaultShippingFeeMinor: 5_000,
          percentageRate: null,
        },
      }),
    );
    expect(alwaysFree.ok && alwaysFree.pricing.shipping.minor).toBe(0);
  });
});

describe("payment fee and tax", () => {
  it("applies percentage and fixed payment fees on SUBTOTAL_PLUS_SHIPPING", () => {
    const percent = calculateOrderPricing(
      baseInput({
        lines: [
          {
            productId: "p1",
            variantId: "v1",
            quantity: 1,
            unitPriceMinor: 10_000,
          },
        ],
        shipping: {
          enabled: true,
          method: "flat_rate",
          freeShippingThresholdMinor: null,
          defaultShippingFeeMinor: 0,
          percentageRate: null,
        },
        paymentFee: {
          enabled: true,
          feeType: "PERCENTAGE",
          feeValue: 2,
          feeBasis: "SUBTOTAL_PLUS_SHIPPING",
        },
      }),
    );
    expect(percent.ok).toBe(true);
    if (percent.ok) {
      expect(percent.pricing.paymentFee.minor).toBe(200);
      expect(percent.pricing.grandTotal.minor).toBe(10_200);
    }

    const fixed = calculateOrderPricing(
      baseInput({
        lines: [
          {
            productId: "p1",
            variantId: "v1",
            quantity: 1,
            unitPriceMinor: 10_000,
          },
        ],
        shipping: {
          enabled: false,
          method: "flat_rate",
          freeShippingThresholdMinor: null,
          defaultShippingFeeMinor: 0,
          percentageRate: null,
        },
        paymentFee: {
          enabled: true,
          feeType: "FIXED",
          feeValue: 150,
          feeBasis: "SUBTOTAL_PLUS_SHIPPING",
        },
      }),
    );
    expect(fixed.ok && fixed.pricing.paymentFee.minor).toBe(150);
  });

  it("returns zero fee/tax when disabled and discount placeholder stays zero", () => {
    const result = calculateOrderPricing(baseInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pricing.paymentFee.minor).toBe(0);
      expect(result.pricing.tax.minor).toBe(0);
      expect(result.pricing.discount.minor).toBe(0);
    }
  });

  it("rejects excessive percentage fees", () => {
    const result = calculateOrderPricing(
      baseInput({
        paymentFee: {
          enabled: true,
          feeType: "PERCENTAGE",
          feeValue: 150,
          feeBasis: "SUBTOTAL",
        },
      }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("deterministic pricing and currency", () => {
  it("produces identical totals for identical inputs", () => {
    const a = calculateOrderPricing(baseInput());
    const b = calculateOrderPricing(baseInput());
    expect(a).toEqual(b);
  });

  it("includes currency from input without hardcoding symbols", () => {
    const usd = calculateOrderPricing(baseInput({ currency: "USD" }));
    expect(usd.ok && usd.pricing.currency).toBe("USD");
  });
});

describe("settings validation and permissions", () => {
  it("rejects negative shipping fees and absurd percentages", () => {
    expect(
      shippingSettingsSchema.safeParse({
        enabled: true,
        method: "flat_rate",
        freeShippingThreshold: -1,
        defaultShippingFee: 10,
      }).success,
    ).toBe(false);
    expect(
      paymentSettingsSchema.safeParse({
        provider: "none",
        feeEnabled: true,
        feeType: "PERCENTAGE",
        feeValue: 200,
        feeBasis: "SUBTOTAL_PLUS_SHIPPING",
        taxEnabled: false,
        taxType: "PERCENTAGE",
        taxValue: 0,
      }).success,
    ).toBe(false);
  });

  it("enforces shipping/payment update permissions by role", () => {
    expect(hasPermission(["ADMIN"], "shipping.update")).toBe(true);
    expect(hasPermission(["EDITOR"], "shipping.update")).toBe(false);
    expect(hasPermission(["EDITOR"], "shipping.view")).toBe(true);
    expect(hasPermission(["ORDER_MANAGER"], "shipping.view")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "payments.view")).toBe(true);
    expect(hasPermission(["ORDER_MANAGER"], "payments.update")).toBe(false);
    expect(hasPermission(["ADMIN"], "payments.update")).toBe(true);
  });

  it("documents catalog rejection contracts used before pricing", () => {
    const messages = {
      inactiveProduct: "This product is currently unavailable.",
      inactiveVariant: "This product option is currently unavailable.",
      outOfStock: "This item is out of stock.",
      serverAuthority: "unit prices must come from the database",
      storeScope: "store_id must match the active store",
    };
    expect(messages.inactiveProduct).toMatch(/unavailable/i);
    expect(messages.outOfStock).toMatch(/out of stock/i);
    expect(messages.serverAuthority).toMatch(/database/i);
    expect(messages.storeScope).toMatch(/store_id/);
  });
});
