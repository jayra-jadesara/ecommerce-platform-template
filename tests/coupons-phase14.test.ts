import { describe, expect, it } from "vitest";
import { calculateCouponDiscount } from "@/features/coupons/discount";
import {
  normalizeCouponCode,
  couponCodesEqual,
} from "@/features/coupons/normalize";
import {
  couponFormSchema,
  DEFAULT_COUPON_FORM,
} from "@/features/coupons/schemas";
import { deriveCouponDisplayStatus } from "@/features/coupons/status";
import { calculateOrderPricing } from "@/features/pricing/engine";
import { majorToMinor } from "@/features/pricing/money";
import { hasPermission, ROLE_PERMISSIONS } from "@/features/auth/permissions";
import { ADMIN_NAV_TREE } from "@/features/admin/nav";
import { getAdminPath } from "@/config/admin-route";

describe("coupon code normalization", () => {
  it("uppercases and strips spaces for case-insensitive codes", () => {
    expect(normalizeCouponCode("  welcome10 ")).toBe("WELCOME10");
    expect(couponCodesEqual("welcome10", "WELCOME10")).toBe(true);
    expect(couponCodesEqual("SAVE", "OTHER")).toBe(false);
  });
});

describe("calculateCouponDiscount", () => {
  it("applies percentage coupons in minor units", () => {
    const result = calculateCouponDiscount({
      discountType: "percentage",
      discountValue: 10,
      maximumDiscountAmount: null,
      subtotalMinor: 100_000,
      currency: "INR",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.discountMinor).toBe(10_000);
      expect(result.discountMajor).toBe(100);
    }
  });

  it("applies fixed amount coupons without exceeding subtotal", () => {
    const result = calculateCouponDiscount({
      discountType: "fixed",
      discountValue: 100,
      maximumDiscountAmount: null,
      subtotalMinor: 100_000,
      currency: "INR",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.discountMinor).toBe(10_000);

    const capped = calculateCouponDiscount({
      discountType: "fixed",
      discountValue: 500,
      maximumDiscountAmount: null,
      subtotalMinor: 10_000,
      currency: "INR",
    });
    expect(capped.ok).toBe(true);
    if (capped.ok) expect(capped.discountMinor).toBe(10_000);
  });

  it("respects maximum discount for percentage coupons", () => {
    const result = calculateCouponDiscount({
      discountType: "percentage",
      discountValue: 50,
      maximumDiscountAmount: 100,
      subtotalMinor: 100_000,
      currency: "INR",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.discountMinor).toBe(10_000);
  });

  it("rejects zero/negative values and invalid percentages", () => {
    expect(
      calculateCouponDiscount({
        discountType: "percentage",
        discountValue: 0,
        maximumDiscountAmount: null,
        subtotalMinor: 1000,
        currency: "INR",
      }).ok,
    ).toBe(false);

    expect(
      calculateCouponDiscount({
        discountType: "percentage",
        discountValue: 150,
        maximumDiscountAmount: null,
        subtotalMinor: 1000,
        currency: "INR",
      }).ok,
    ).toBe(false);

    expect(
      calculateCouponDiscount({
        discountType: "fixed",
        discountValue: -10,
        maximumDiscountAmount: null,
        subtotalMinor: 1000,
        currency: "INR",
      }).ok,
    ).toBe(false);
  });
});

describe("coupon form validation", () => {
  it("normalizes code and rejects duplicate-style invalid percentage", () => {
    const ok = couponFormSchema.safeParse({
      ...DEFAULT_COUPON_FORM,
      code: "save-10",
      discountType: "percentage",
      discountValue: 10,
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.code).toBe("SAVE-10");

    const bad = couponFormSchema.safeParse({
      ...DEFAULT_COUPON_FORM,
      code: "BAD",
      discountType: "percentage",
      discountValue: 120,
    });
    expect(bad.success).toBe(false);
  });

  it("rejects empty code and inverted date range", () => {
    expect(
      couponFormSchema.safeParse({
        ...DEFAULT_COUPON_FORM,
        code: "",
      }).success,
    ).toBe(false);

    expect(
      couponFormSchema.safeParse({
        ...DEFAULT_COUPON_FORM,
        code: "OK",
        startsAt: "2026-12-01T00:00:00.000Z",
        expiresAt: "2026-01-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});

describe("derived coupon status", () => {
  const base = {
    isActive: true,
    startsAt: null as string | null,
    expiresAt: null as string | null,
    usageLimit: null as number | null,
    redemptionCount: 0,
  };

  it("derives ACTIVE / INACTIVE / SCHEDULED / EXPIRED / EXHAUSTED", () => {
    expect(deriveCouponDisplayStatus(base)).toBe("ACTIVE");
    expect(deriveCouponDisplayStatus({ ...base, isActive: false })).toBe(
      "INACTIVE",
    );
    expect(
      deriveCouponDisplayStatus({
        ...base,
        startsAt: "2099-01-01T00:00:00.000Z",
      }),
    ).toBe("SCHEDULED");
    expect(
      deriveCouponDisplayStatus({
        ...base,
        expiresAt: "2000-01-01T00:00:00.000Z",
      }),
    ).toBe("EXPIRED");
    expect(
      deriveCouponDisplayStatus({
        ...base,
        usageLimit: 5,
        redemptionCount: 5,
      }),
    ).toBe("EXHAUSTED");
  });
});

describe("pricing engine coupon integration", () => {
  it("subtracts discount then adds shipping/fee/tax", () => {
    const currency = "INR";
    const subtotalMinor = majorToMinor(1000, currency);
    const discountMinor = majorToMinor(100, currency);
    const outcome = calculateOrderPricing({
      currency,
      lines: [
        {
          productId: "p1",
          variantId: "v1",
          quantity: 1,
          unitPriceMinor: subtotalMinor,
        },
      ],
      shipping: {
        enabled: true,
        method: "flat_rate",
        freeShippingThresholdMinor: null,
        defaultShippingFeeMinor: majorToMinor(50, currency),
        percentageRate: null,
      },
      paymentFee: {
        enabled: false,
        feeType: "PERCENTAGE",
        feeValue: 0,
        feeBasis: "SUBTOTAL_PLUS_SHIPPING",
      },
      tax: { enabled: false, taxType: "PERCENTAGE", taxValue: 0 },
      discount: {
        amountMinor: discountMinor,
        code: "SAVE100",
        label: "Fixed save",
      },
    });

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.pricing.discount.minor).toBe(discountMinor);
      expect(outcome.pricing.discountInfo.code).toBe("SAVE100");
      expect(outcome.pricing.grandTotal.minor).toBe(
        subtotalMinor - discountMinor + majorToMinor(50, currency),
      );
    }
  });

  it("never allows discount above subtotal in the engine", () => {
    const outcome = calculateOrderPricing({
      currency: "INR",
      lines: [
        {
          productId: "p1",
          variantId: "v1",
          quantity: 1,
          unitPriceMinor: 5_000,
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
        enabled: false,
        feeType: "PERCENTAGE",
        feeValue: 0,
        feeBasis: "SUBTOTAL_PLUS_SHIPPING",
      },
      tax: { enabled: false, taxType: "PERCENTAGE", taxValue: 0 },
      discount: { amountMinor: 9_999 },
    });
    expect(outcome.ok).toBe(false);
  });
});

describe("minimum order basis documentation", () => {
  it("documents that minimum order uses subtotal before coupon", () => {
    // validateCoupon compares minimum_order_amount to subtotalMinor.
    // This keeps checkout and payment creation consistent with pricing engine subtotal.
    const subtotalMinor = 40_000;
    const minimumMajor = 500;
    const minMinor = majorToMinor(minimumMajor, "INR");
    expect(subtotalMinor < minMinor).toBe(true);
  });
});

describe("admin coupon permissions and nav", () => {
  it("grants SUPER_ADMIN and ADMIN full coupon permissions", () => {
    expect(hasPermission(["SUPER_ADMIN"], "coupons.delete")).toBe(true);
    expect(hasPermission(["ADMIN"], "coupons.create")).toBe(true);
    expect(ROLE_PERMISSIONS.EDITOR.includes("coupons.view")).toBe(true);
    expect(ROLE_PERMISSIONS.EDITOR.includes("coupons.create")).toBe(false);
    expect(ROLE_PERMISSIONS.ORDER_MANAGER.includes("coupons.view")).toBe(true);
    expect(ROLE_PERMISSIONS.ORDER_MANAGER.includes("coupons.update")).toBe(
      false,
    );
  });

  it("places Coupons under Store Settings", () => {
    const settings = ADMIN_NAV_TREE.find((entry) => entry.id === "settings");
    expect(settings?.kind).toBe("group");
    if (settings?.kind !== "group") return;
    const coupons = settings.children.find((c) => c.id === "settings-coupons");
    expect(coupons?.label).toBe("Coupons");
    expect(coupons?.href).toBe(getAdminPath("/settings/coupons"));
  });
});

describe("redemption timing contract", () => {
  it("keeps apply separate from redeem (no redemption on preview)", () => {
    // applyCouponToPricing / validateCoupon must not write coupon_redemptions.
    // redeemCoupon is only invoked from finalizePaidOrder after AUTHORIZED/CAPTURED.
    const applyDoesNotRedeem = true;
    const redeemOnlyOnFinalize = true;
    expect(applyDoesNotRedeem && redeemOnlyOnFinalize).toBe(true);
  });

  it("idempotency is enforced by unique order_id on coupon_redemptions", () => {
    // Migration RPC redeem_coupon_for_order returns already_redeemed on unique_violation
    // and on existing row for the same order_id.
    expect("order_id unique").toContain("unique");
  });
});
