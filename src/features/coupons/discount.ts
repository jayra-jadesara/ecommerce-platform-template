import {
  currencyFractionDigits,
  majorToMinor,
  minorToMajor,
  percentOfMinor,
} from "@/features/pricing/money";
import type { CouponDiscountType } from "@/features/coupons/types";

export type CalculateCouponDiscountInput = {
  discountType: CouponDiscountType;
  /** Percentage 0–100, or fixed amount in major units. */
  discountValue: number;
  maximumDiscountAmount: number | null;
  /** Eligible subtotal in minor units (currently full cart/checkout subtotal). */
  subtotalMinor: number;
  currency: string;
};

export type CalculateCouponDiscountResult =
  | { ok: true; discountMinor: number; discountMajor: number }
  | { ok: false; error: string };

/**
 * Pure coupon discount math in minor units.
 * Cap: never exceed subtotal; percentage may also respect maximum_discount_amount.
 */
export function calculateCouponDiscount(
  input: CalculateCouponDiscountInput,
): CalculateCouponDiscountResult {
  const { discountType, discountValue, maximumDiscountAmount, subtotalMinor, currency } =
    input;

  if (!Number.isInteger(subtotalMinor) || subtotalMinor < 0) {
    return { ok: false, error: "Invalid subtotal." };
  }
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { ok: false, error: "Invalid discount value." };
  }

  let discountMinor = 0;

  if (discountType === "percentage") {
    if (discountValue > 100) {
      return { ok: false, error: "Invalid percentage." };
    }
    discountMinor = percentOfMinor(subtotalMinor, discountValue);
    if (maximumDiscountAmount != null && maximumDiscountAmount >= 0) {
      const maxMinor = majorToMinor(maximumDiscountAmount, currency);
      discountMinor = Math.min(discountMinor, maxMinor);
    }
  } else if (discountType === "fixed") {
    discountMinor = majorToMinor(discountValue, currency);
  } else {
    return { ok: false, error: "Invalid discount type." };
  }

  discountMinor = Math.max(0, Math.min(discountMinor, subtotalMinor));
  discountMinor = Math.round(discountMinor);

  const digits = currencyFractionDigits(currency);
  return {
    ok: true,
    discountMinor,
    discountMajor: minorToMajor(discountMinor, digits),
  };
}
