export const PRICING_ENGINE_VERSION = "1";

export type ShippingMethodCode =
  | "flat_rate"
  | "free"
  | "percentage"
  | "zone"
  /** Future extensibility markers (not calculated yet). */
  | "WEIGHT"
  | "PRICE_BASED"
  | "METHOD_BASED";

export type PaymentFeeType = "PERCENTAGE" | "FIXED";

/**
 * Explicit fee basis — do not change silently across flows.
 * Default for this phase: SUBTOTAL_PLUS_SHIPPING
 * (= subtotal − discount + shipping, before payment fee and tax).
 */
export type PaymentFeeBasis =
  | "SUBTOTAL"
  | "SUBTOTAL_PLUS_SHIPPING"
  | "ORDER_TOTAL_BEFORE_PAYMENT_FEE";

export type TaxType = "PERCENTAGE" | "FIXED";

export type PricingLineInput = {
  productId: string;
  variantId: string;
  quantity: number;
  /** Authoritative unit price in minor units (from DB). */
  unitPriceMinor: number;
  productName?: string;
  variantName?: string;
};

export type ShippingConfigInput = {
  enabled: boolean;
  method: ShippingMethodCode;
  /** Major-unit values from DB are converted before calling the engine. */
  freeShippingThresholdMinor: number | null;
  defaultShippingFeeMinor: number;
  percentageRate: number | null;
};

export type PaymentFeeConfigInput = {
  enabled: boolean;
  feeType: PaymentFeeType;
  /** PERCENTAGE: 0–100; FIXED: minor units. */
  feeValue: number;
  feeBasis: PaymentFeeBasis;
};

export type TaxConfigInput = {
  enabled: boolean;
  taxType: TaxType;
  taxValue: number;
};

export type DiscountInput = {
  /** Minor units. Coupons not implemented — use 0. */
  amountMinor: number;
  code?: string | null;
  label?: string | null;
};

export type PricingEngineInput = {
  currency: string;
  lines: PricingLineInput[];
  shipping: ShippingConfigInput;
  paymentFee: PaymentFeeConfigInput;
  tax: TaxConfigInput;
  discount: DiscountInput;
};

export type MoneyBreakdown = {
  /** Integer minor units (authoritative). */
  minor: number;
  /** Major units for display helpers (derived). */
  major: number;
};

export type PricingResult = {
  version: string;
  currency: string;
  fractionDigits: number;
  subtotal: MoneyBreakdown;
  discount: MoneyBreakdown;
  shipping: MoneyBreakdown;
  paymentFee: MoneyBreakdown;
  tax: MoneyBreakdown;
  grandTotal: MoneyBreakdown;
  shippingRule: {
    enabled: boolean;
    method: ShippingMethodCode;
    freeShippingApplied: boolean;
    thresholdMinor: number | null;
    defaultFeeMinor: number;
  };
  paymentFeeRule: {
    enabled: boolean;
    feeType: PaymentFeeType;
    feeValue: number;
    feeBasis: PaymentFeeBasis;
    basisMinor: number;
  };
  taxRule: {
    enabled: boolean;
    taxType: TaxType;
    taxValue: number;
  };
  discountInfo: {
    amountMinor: number;
    code: string | null;
    label: string | null;
  };
  lineCount: number;
  itemCount: number;
};

export type PricingEngineErrorCode =
  | "EMPTY_LINES"
  | "INVALID_QUANTITY"
  | "INVALID_PRICE"
  | "INVALID_CONFIG"
  | "NEGATIVE_TOTAL";

export type PricingEngineSuccess = {
  ok: true;
  pricing: PricingResult;
};

export type PricingEngineFailure = {
  ok: false;
  code: PricingEngineErrorCode;
  error: string;
};

export type PricingEngineOutcome = PricingEngineSuccess | PricingEngineFailure;
