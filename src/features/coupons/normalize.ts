/** Normalize coupon codes for storage and comparison (case-insensitive). */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function couponCodesEqual(a: string, b: string): boolean {
  return normalizeCouponCode(a) === normalizeCouponCode(b);
}
