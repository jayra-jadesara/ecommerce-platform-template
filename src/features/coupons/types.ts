import type { DiscountType } from "@/types/database";

export type CouponDiscountType = DiscountType;

/** Derived display status — not stored. */
export type CouponDisplayStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SCHEDULED"
  | "EXPIRED"
  | "EXHAUSTED";

export type CouponRow = {
  id: string;
  storeId: string;
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderAmount: number | null;
  maximumDiscountAmount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CouponValidationErrorCode =
  | "INVALID"
  | "EXPIRED"
  | "NOT_STARTED"
  | "INACTIVE"
  | "USAGE_LIMIT"
  | "PER_USER_LIMIT"
  | "MINIMUM_ORDER"
  | "INVALID_VALUE";

export type CouponValidationFailure = {
  ok: false;
  code: CouponValidationErrorCode;
  message: string;
};

export type CouponValidationSuccess = {
  ok: true;
  coupon: CouponRow;
  discountMinor: number;
  discountMajor: number;
  /** Minimum order basis: cart/checkout subtotal (before coupon). */
  basis: "subtotal";
};

export type CouponValidationResult =
  | CouponValidationSuccess
  | CouponValidationFailure;

export type AppliedCouponContext = {
  couponId: string;
  code: string;
  discountMinor: number;
  discountMajor: number;
  label: string | null;
};

/**
 * Future targeting hooks — not enforced until schema supports them.
 * Keep optional so callers can pass restrictions without branching yet.
 */
export type CouponEligibilityContext = {
  productIds?: string[];
  categoryIds?: string[];
  minimumQuantity?: number;
};
