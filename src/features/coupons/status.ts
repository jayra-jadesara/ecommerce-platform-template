import type {
  CouponDisplayStatus,
  CouponRow,
} from "@/features/coupons/types";

export function deriveCouponDisplayStatus(
  coupon: Pick<
    CouponRow,
    "isActive" | "startsAt" | "expiresAt" | "usageLimit"
  > & { redemptionCount?: number },
  now: Date = new Date(),
): CouponDisplayStatus {
  const redemptionCount = coupon.redemptionCount ?? 0;

  if (
    coupon.usageLimit != null &&
    redemptionCount >= coupon.usageLimit
  ) {
    return "EXHAUSTED";
  }

  if (!coupon.isActive) return "INACTIVE";

  if (coupon.startsAt) {
    const starts = new Date(coupon.startsAt);
    if (starts.getTime() > now.getTime()) return "SCHEDULED";
  }

  if (coupon.expiresAt) {
    const expires = new Date(coupon.expiresAt);
    if (expires.getTime() < now.getTime()) return "EXPIRED";
  }

  return "ACTIVE";
}

export function couponStatusLabel(status: CouponDisplayStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "SCHEDULED":
      return "Scheduled";
    case "EXPIRED":
      return "Expired";
    case "EXHAUSTED":
      return "Exhausted";
    default:
      return status;
  }
}
