import "server-only";

import { formatMoney } from "@/features/catalog/money";
import { calculateCouponDiscount } from "@/features/coupons/discount";
import { mapCouponRow } from "@/features/coupons/map";
import { normalizeCouponCode } from "@/features/coupons/normalize";
import type {
  CouponEligibilityContext,
  CouponValidationResult,
} from "@/features/coupons/types";
import { majorToMinor, minorToMajor } from "@/features/pricing/money";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const GENERIC_INVALID = "Coupon is invalid.";

/**
 * Server-side coupon validation for a store + optional customer.
 * Loads coupon via service role (no public coupon list).
 * Minimum order applies to **subtotal** (before coupon), in major/minor store currency.
 *
 * Eligibility hooks are accepted for future product/category rules but not enforced yet.
 */
export async function validateCoupon(input: {
  storeId: string;
  code: string;
  /** Subtotal in minor units — discount basis. */
  subtotalMinor: number;
  currency: string;
  userId?: string | null;
  now?: Date;
  eligibility?: CouponEligibilityContext;
}): Promise<CouponValidationResult> {
  void input.eligibility; // reserved for future targeting

  const code = normalizeCouponCode(input.code);
  if (!code) {
    return { ok: false, code: "INVALID", message: GENERIC_INVALID };
  }

  if (!Number.isInteger(input.subtotalMinor) || input.subtotalMinor < 0) {
    return { ok: false, code: "INVALID", message: GENERIC_INVALID };
  }

  const supabase = createSupabaseServiceClient();
  const { data: rows, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("store_id", input.storeId)
    .ilike("code", code)
    .limit(5);

  if (error || !rows?.length) {
    return { ok: false, code: "INVALID", message: GENERIC_INVALID };
  }

  // Prefer exact normalized match among case-insensitive hits.
  const row =
    rows.find((r) => normalizeCouponCode(r.code) === code) ?? rows[0];
  if (!row || row.store_id !== input.storeId) {
    return { ok: false, code: "INVALID", message: GENERIC_INVALID };
  }

  const coupon = mapCouponRow(row);
  const now = input.now ?? new Date();

  if (!coupon.isActive) {
    return { ok: false, code: "INACTIVE", message: GENERIC_INVALID };
  }

  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now.getTime()) {
    return {
      ok: false,
      code: "NOT_STARTED",
      message: "This coupon is not available yet.",
    };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now.getTime()) {
    return {
      ok: false,
      code: "EXPIRED",
      message: "Coupon has expired.",
    };
  }

  const { count: totalUses, error: countError } = await supabase
    .from("coupon_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", coupon.id);

  if (countError) {
    return { ok: false, code: "INVALID", message: GENERIC_INVALID };
  }

  if (
    coupon.usageLimit != null &&
    (totalUses ?? 0) >= coupon.usageLimit
  ) {
    return {
      ok: false,
      code: "USAGE_LIMIT",
      message: "This coupon has reached its usage limit.",
    };
  }

  if (input.userId && coupon.perUserLimit != null) {
    const { count: userUses, error: userCountError } = await supabase
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("user_id", input.userId);

    if (userCountError) {
      return { ok: false, code: "INVALID", message: GENERIC_INVALID };
    }

    if ((userUses ?? 0) >= coupon.perUserLimit) {
      return {
        ok: false,
        code: "PER_USER_LIMIT",
        message: "You have already used this coupon the maximum number of times.",
      };
    }
  }

  if (coupon.minimumOrderAmount != null && coupon.minimumOrderAmount > 0) {
    const minMinor = majorToMinor(coupon.minimumOrderAmount, input.currency);
    if (input.subtotalMinor < minMinor) {
      return {
        ok: false,
        code: "MINIMUM_ORDER",
        message: `Minimum order amount is ${formatMoney(coupon.minimumOrderAmount, input.currency)}.`,
      };
    }
  }

  const calculated = calculateCouponDiscount({
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    maximumDiscountAmount: coupon.maximumDiscountAmount,
    subtotalMinor: input.subtotalMinor,
    currency: input.currency,
  });

  if (!calculated.ok) {
    return { ok: false, code: "INVALID_VALUE", message: GENERIC_INVALID };
  }

  if (calculated.discountMinor <= 0) {
    return { ok: false, code: "INVALID_VALUE", message: GENERIC_INVALID };
  }

  return {
    ok: true,
    coupon,
    discountMinor: calculated.discountMinor,
    discountMajor: calculated.discountMajor,
    basis: "subtotal",
  };
}

/** Re-export helper for major display of validated discount. */
export function discountMinorToMajor(
  discountMinor: number,
  currency: string,
): number {
  return minorToMajor(discountMinor, currency);
}
