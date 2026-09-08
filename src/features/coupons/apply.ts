import "server-only";

import { validateCoupon } from "@/features/coupons/validate";
import type { AppliedCouponContext } from "@/features/coupons/types";

/**
 * Resolve a coupon code into pricing-engine discount context.
 * Frontend must never supply the discount amount as authority.
 */
export async function applyCouponToPricing(input: {
  storeId: string;
  code: string | null | undefined;
  subtotalMinor: number;
  currency: string;
  userId?: string | null;
}): Promise<
  | { ok: true; applied: AppliedCouponContext | null }
  | { ok: false; message: string }
> {
  const raw = input.code?.trim();
  if (!raw) {
    return { ok: true, applied: null };
  }

  const result = await validateCoupon({
    storeId: input.storeId,
    code: raw,
    subtotalMinor: input.subtotalMinor,
    currency: input.currency,
    userId: input.userId,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return {
    ok: true,
    applied: {
      couponId: result.coupon.id,
      code: result.coupon.code,
      discountMinor: result.discountMinor,
      discountMajor: result.discountMajor,
      label: result.coupon.description,
    },
  };
}
