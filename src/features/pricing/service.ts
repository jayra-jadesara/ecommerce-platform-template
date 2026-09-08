import "server-only";

import { applyCouponToPricing } from "@/features/coupons/apply";
import { calculateOrderPricing } from "@/features/pricing/engine";
import { loadPricingContext } from "@/features/pricing/config";
import { majorToMinor } from "@/features/pricing/money";
import type {
  PricingEngineOutcome,
  PricingLineInput,
  PricingResult,
} from "@/features/pricing/types";

export type CalculateOrderPricingParams = {
  storeId?: string | null;
  lines: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    /** Major-unit unit price from DB (authoritative). */
    unitPrice: number;
    productName?: string;
    variantName?: string;
  }>;
  /**
   * Optional coupon code from the client. Server validates and resolves discount.
   * Never trust a client-supplied discount amount as authority.
   */
  couponCode?: string | null;
  userId?: string | null;
  /**
   * Advanced: pre-resolved discount minor (tests / internal). Ignored when
   * couponCode is provided.
   */
  discountMinor?: number;
  discountCode?: string | null;
  discountLabel?: string | null;
  /**
   * When true, forces shipping/payment/tax off (cart subtotal-only preview).
   * Checkout and payment must call with includeExtras=true (default).
   */
  includeExtras?: boolean;
};

export type CalculateOrderPricingServiceResult = PricingEngineOutcome & {
  couponMessage?: string | null;
  couponId?: string | null;
};

/**
 * Single source of truth for cart / checkout / order & payment amounts.
 * Always pass server-resolved catalog prices — never browser amounts.
 */
export async function calculateOrderPricingService(
  params: CalculateOrderPricingParams,
): Promise<CalculateOrderPricingServiceResult> {
  const includeExtras = params.includeExtras !== false;
  const context = await loadPricingContext(params.storeId);

  const lines: PricingLineInput[] = params.lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    quantity: line.quantity,
    unitPriceMinor: majorToMinor(line.unitPrice, context.currency),
    productName: line.productName,
    variantName: line.variantName,
  }));

  const subtotalMinor = lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );

  let discountMinor = params.discountMinor ?? 0;
  let discountCode = params.discountCode ?? null;
  let discountLabel = params.discountLabel ?? null;
  let couponMessage: string | null = null;
  let couponId: string | null = null;

  if (params.couponCode?.trim() && params.storeId) {
    const applied = await applyCouponToPricing({
      storeId: params.storeId,
      code: params.couponCode,
      subtotalMinor,
      currency: context.currency,
      userId: params.userId,
    });
    if (!applied.ok) {
      couponMessage = applied.message;
      discountMinor = 0;
      discountCode = null;
      discountLabel = null;
    } else if (applied.applied) {
      discountMinor = applied.applied.discountMinor;
      discountCode = applied.applied.code;
      discountLabel = applied.applied.label;
      couponId = applied.applied.couponId;
    }
  }

  const outcome = calculateOrderPricing({
    currency: context.currency,
    lines,
    shipping: includeExtras
      ? context.shipping
      : {
          enabled: false,
          method: "flat_rate",
          freeShippingThresholdMinor: null,
          defaultShippingFeeMinor: 0,
          percentageRate: null,
        },
    paymentFee: includeExtras
      ? context.paymentFee
      : {
          enabled: false,
          feeType: "PERCENTAGE",
          feeValue: 0,
          feeBasis: "SUBTOTAL_PLUS_SHIPPING",
        },
    tax: includeExtras
      ? context.tax
      : { enabled: false, taxType: "PERCENTAGE", taxValue: 0 },
    discount: {
      amountMinor: discountMinor,
      code: discountCode,
      label: discountLabel,
    },
  });

  if (!outcome.ok) {
    return { ...outcome, couponMessage, couponId };
  }

  return { ...outcome, couponMessage, couponId };
}

export type { PricingResult };
