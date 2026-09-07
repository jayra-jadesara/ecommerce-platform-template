import {
  assertNonNegativeMinor,
  currencyFractionDigits,
  minorToMajor,
  percentOfMinor,
} from "@/features/pricing/money";
import type {
  MoneyBreakdown,
  PricingEngineInput,
  PricingEngineOutcome,
  PricingResult,
  ShippingMethodCode,
} from "@/features/pricing/types";
import { PRICING_ENGINE_VERSION } from "@/features/pricing/types";

function money(minor: number, currency: string, digits: number): MoneyBreakdown {
  assertNonNegativeMinor(minor, "Amount");
  return { minor, major: minorToMajor(minor, digits) };
}

function shippingFeeMinor(
  subtotalAfterDiscount: number,
  shipping: PricingEngineInput["shipping"],
): { feeMinor: number; freeShippingApplied: boolean; method: ShippingMethodCode } {
  if (!shipping.enabled) {
    return { feeMinor: 0, freeShippingApplied: false, method: shipping.method };
  }

  if (shipping.method === "free") {
    return { feeMinor: 0, freeShippingApplied: true, method: "free" };
  }

  // FREE_THRESHOLD behavior for flat_rate (and zone until zone rules exist).
  if (
    shipping.freeShippingThresholdMinor != null &&
    subtotalAfterDiscount >= shipping.freeShippingThresholdMinor
  ) {
    return {
      feeMinor: 0,
      freeShippingApplied: true,
      method: shipping.method,
    };
  }

  if (
    shipping.method === "percentage" &&
    shipping.percentageRate != null &&
    shipping.percentageRate > 0
  ) {
    return {
      feeMinor: percentOfMinor(subtotalAfterDiscount, shipping.percentageRate),
      freeShippingApplied: false,
      method: "percentage",
    };
  }

  // flat_rate, zone (fallback), WEIGHT/PRICE_BASED/METHOD_BASED placeholders
  return {
    feeMinor: Math.max(0, shipping.defaultShippingFeeMinor),
    freeShippingApplied: false,
    method: shipping.method,
  };
}

function paymentFeeMinor(
  input: PricingEngineInput,
  subtotalMinor: number,
  discountMinor: number,
  shippingMinor: number,
): { feeMinor: number; basisMinor: number } {
  const fee = input.paymentFee;
  if (!fee.enabled) return { feeMinor: 0, basisMinor: 0 };

  let basisMinor = 0;
  switch (fee.feeBasis) {
    case "SUBTOTAL":
      basisMinor = Math.max(0, subtotalMinor - discountMinor);
      break;
    case "SUBTOTAL_PLUS_SHIPPING":
    case "ORDER_TOTAL_BEFORE_PAYMENT_FEE":
      basisMinor = Math.max(0, subtotalMinor - discountMinor + shippingMinor);
      break;
    default:
      basisMinor = Math.max(0, subtotalMinor - discountMinor + shippingMinor);
  }

  if (fee.feeType === "PERCENTAGE") {
    return {
      feeMinor: percentOfMinor(basisMinor, fee.feeValue),
      basisMinor,
    };
  }

  return { feeMinor: Math.max(0, Math.round(fee.feeValue)), basisMinor };
}

function taxMinor(
  input: PricingEngineInput,
  subtotalMinor: number,
  discountMinor: number,
  shippingMinor: number,
): number {
  const tax = input.tax;
  if (!tax.enabled) return 0;
  const basis = Math.max(0, subtotalMinor - discountMinor + shippingMinor);
  if (tax.taxType === "PERCENTAGE") {
    return percentOfMinor(basis, tax.taxValue);
  }
  return Math.max(0, Math.round(tax.taxValue));
}

/**
 * Pure, deterministic order pricing. Single source of truth for totals.
 * Callers must supply already-authoritative unit prices (from DB).
 */
export function calculateOrderPricing(
  input: PricingEngineInput,
): PricingEngineOutcome {
  const digits = currencyFractionDigits(input.currency);

  if (!input.lines.length) {
    return { ok: false, code: "EMPTY_LINES", error: "No line items to price." };
  }

  let subtotalMinor = 0;
  let itemCount = 0;

  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      return {
        ok: false,
        code: "INVALID_QUANTITY",
        error: "Each line quantity must be a positive integer.",
      };
    }
    if (!Number.isInteger(line.unitPriceMinor) || line.unitPriceMinor < 0) {
      return {
        ok: false,
        code: "INVALID_PRICE",
        error: "Unit prices must be non-negative integer minor units.",
      };
    }
    subtotalMinor += line.unitPriceMinor * line.quantity;
    itemCount += line.quantity;
  }

  const discountMinor = Math.max(0, Math.round(input.discount.amountMinor));
  if (discountMinor > subtotalMinor) {
    return {
      ok: false,
      code: "INVALID_CONFIG",
      error: "Discount cannot exceed subtotal.",
    };
  }

  if (
    input.paymentFee.enabled &&
    input.paymentFee.feeType === "PERCENTAGE" &&
    (input.paymentFee.feeValue < 0 || input.paymentFee.feeValue > 100)
  ) {
    return {
      ok: false,
      code: "INVALID_CONFIG",
      error: "Payment fee percentage must be between 0 and 100.",
    };
  }

  if (
    input.shipping.defaultShippingFeeMinor < 0 ||
    (input.shipping.freeShippingThresholdMinor != null &&
      input.shipping.freeShippingThresholdMinor < 0)
  ) {
    return {
      ok: false,
      code: "INVALID_CONFIG",
      error: "Shipping amounts cannot be negative.",
    };
  }

  const afterDiscount = subtotalMinor - discountMinor;
  const ship = shippingFeeMinor(afterDiscount, input.shipping);
  const pay = paymentFeeMinor(
    input,
    subtotalMinor,
    discountMinor,
    ship.feeMinor,
  );
  const taxAmount = taxMinor(
    input,
    subtotalMinor,
    discountMinor,
    ship.feeMinor,
  );

  const grandMinor =
    subtotalMinor - discountMinor + ship.feeMinor + pay.feeMinor + taxAmount;

  if (grandMinor < 0) {
    return {
      ok: false,
      code: "NEGATIVE_TOTAL",
      error: "Grand total cannot be negative.",
    };
  }

  const pricing: PricingResult = {
    version: PRICING_ENGINE_VERSION,
    currency: input.currency,
    fractionDigits: digits,
    subtotal: money(subtotalMinor, input.currency, digits),
    discount: money(discountMinor, input.currency, digits),
    shipping: money(ship.feeMinor, input.currency, digits),
    paymentFee: money(pay.feeMinor, input.currency, digits),
    tax: money(taxAmount, input.currency, digits),
    grandTotal: money(grandMinor, input.currency, digits),
    shippingRule: {
      enabled: input.shipping.enabled,
      method: ship.method,
      freeShippingApplied: ship.freeShippingApplied,
      thresholdMinor: input.shipping.freeShippingThresholdMinor,
      defaultFeeMinor: input.shipping.defaultShippingFeeMinor,
    },
    paymentFeeRule: {
      enabled: input.paymentFee.enabled,
      feeType: input.paymentFee.feeType,
      feeValue: input.paymentFee.feeValue,
      feeBasis: input.paymentFee.feeBasis,
      basisMinor: pay.basisMinor,
    },
    taxRule: {
      enabled: input.tax.enabled,
      taxType: input.tax.taxType,
      taxValue: input.tax.taxValue,
    },
    discountInfo: {
      amountMinor: discountMinor,
      code: input.discount.code ?? null,
      label: input.discount.label ?? null,
    },
    lineCount: input.lines.length,
    itemCount,
  };

  return { ok: true, pricing };
}

/** Cart-only subtotal from authoritative minor unit prices. */
export function calculateSubtotalMinor(
  lines: Array<{ unitPriceMinor: number; quantity: number }>,
): number {
  let total = 0;
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new Error("Invalid quantity.");
    }
    if (!Number.isInteger(line.unitPriceMinor) || line.unitPriceMinor < 0) {
      throw new Error("Invalid unit price.");
    }
    total += line.unitPriceMinor * line.quantity;
  }
  return total;
}
