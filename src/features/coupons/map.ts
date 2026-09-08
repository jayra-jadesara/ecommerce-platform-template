import type { Tables } from "@/types/database";
import type { CouponRow } from "@/features/coupons/types";

export function mapCouponRow(row: Tables<"coupons">): CouponRow {
  return {
    id: row.id,
    storeId: row.store_id,
    code: row.code,
    description: row.description,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    minimumOrderAmount:
      row.minimum_order_amount == null
        ? null
        : Number(row.minimum_order_amount),
    maximumDiscountAmount:
      row.maximum_discount_amount == null
        ? null
        : Number(row.maximum_discount_amount),
    usageLimit: row.usage_limit,
    perUserLimit: row.per_user_limit,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
