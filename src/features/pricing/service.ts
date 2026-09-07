import "server-only";

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
  /** Future coupon integration — defaults to 0. */
  discountMinor?: number;
  discountCode?: string | null;
  discountLabel?: string | null;
  /**
   * When true, forces shipping/payment/tax off (cart subtotal-only preview).
   * Checkout and payment must call with includeExtras=true (default).
   */
  includeExtras?: boolean;
};

/**
 * Single source of truth for cart / checkout / future order & Razorpay amounts.
 * Always pass server-resolved catalog prices — never browser amounts.
 */
export async function calculateOrderPricingService(
  params: CalculateOrderPricingParams,
): Promise<PricingEngineOutcome> {
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

  return calculateOrderPricing({
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
      amountMinor: params.discountMinor ?? 0,
      code: params.discountCode ?? null,
      label: params.discountLabel ?? null,
    },
  });
}

export type { PricingResult };
