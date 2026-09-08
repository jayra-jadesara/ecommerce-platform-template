import type { CartLineView } from "@/features/cart/types";
import type {
  CustomerAddress,
  ShippingAddressSnapshot,
} from "@/features/addresses/types";
import type { PricingResult } from "@/features/pricing/types";

export type CheckoutStep =
  | "CART_REVIEW"
  | "ADDRESS_SELECTION"
  | "READY_FOR_PAYMENT"
  | "PAYMENT"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED";

export type CheckoutIssueCode =
  | "EMPTY_CART"
  | "PRODUCT_UNAVAILABLE"
  | "VARIANT_UNAVAILABLE"
  | "OUT_OF_STOCK"
  | "QUANTITY_REDUCED"
  | "INACTIVE_PRODUCT"
  | "INACTIVE_VARIANT"
  | "MISSING_ITEM"
  | "UNAUTHORIZED"
  | "STORE_UNAVAILABLE"
  | "PRICING_FAILED";

export type CheckoutIssue = {
  code: CheckoutIssueCode;
  message: string;
  cartItemId?: string;
  productName?: string;
};

export type CheckoutLine = CartLineView & {
  /** Authoritative current unit price from the catalog. */
  currentUnitPrice: number;
};

export type CheckoutSummary = {
  storeId: string | null;
  currency: string;
  lines: CheckoutLine[];
  itemCount: number;
  /** Major-unit subtotal from pricing engine (or 0 when empty). */
  subtotal: number;
  /** Full centralized pricing result when lines are priceable. */
  pricing: PricingResult | null;
  issues: CheckoutIssue[];
  /** True when cart has lines and no blocking availability issues. */
  canProceed: boolean;
  addresses: CustomerAddress[];
  selectedAddressId: string | null;
  shippingSnapshot: ShippingAddressSnapshot | null;
  step: CheckoutStep;
};

export type CheckoutMutationResult =
  | { ok: true; summary: CheckoutSummary; message?: string }
  | { ok: false; error: string; summary?: CheckoutSummary };

export function deriveCheckoutStep(input: {
  canProceed: boolean;
  selectedAddressId: string | null;
}): CheckoutStep {
  if (!input.canProceed) return "CART_REVIEW";
  if (!input.selectedAddressId) return "ADDRESS_SELECTION";
  return "READY_FOR_PAYMENT";
}

export function isCheckoutBlockingIssue(code: CheckoutIssueCode): boolean {
  return (
    code === "EMPTY_CART" ||
    code === "PRODUCT_UNAVAILABLE" ||
    code === "VARIANT_UNAVAILABLE" ||
    code === "OUT_OF_STOCK" ||
    code === "INACTIVE_PRODUCT" ||
    code === "INACTIVE_VARIANT" ||
    code === "MISSING_ITEM" ||
    code === "UNAUTHORIZED" ||
    code === "STORE_UNAVAILABLE" ||
    code === "PRICING_FAILED"
  );
}
