import "server-only";

import {
  getCustomerAddressById,
  getCustomerAddresses,
} from "@/features/addresses/service";
import {
  toShippingAddressSnapshot,
  type CustomerAddress,
} from "@/features/addresses/types";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import {
  cartItemCount,
  type CartLineView,
} from "@/features/cart/types";
import {
  updateCartItemQuantity,
  removeFromCart,
  getCurrentCart,
} from "@/features/cart/service";
import { validatePurchasableVariant } from "@/features/cart/variant-validation";
import {
  deriveCheckoutStep,
  isCheckoutBlockingIssue,
  type CheckoutIssue,
  type CheckoutLine,
  type CheckoutSummary,
} from "@/features/checkout/types";
import { calculateOrderPricingService } from "@/features/pricing/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function loadCurrency(storeId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("store_settings")
    .select("currency")
    .eq("store_id", storeId)
    .maybeSingle();
  return data?.currency || "INR";
}

function emptySummary(
  currency: string,
  issues: CheckoutIssue[],
  addresses: CustomerAddress[] = [],
): CheckoutSummary {
  return {
    storeId: null,
    currency,
    lines: [],
    itemCount: 0,
    subtotal: 0,
    pricing: null,
    couponCode: null,
    couponMessage: null,
    issues,
    canProceed: false,
    addresses,
    selectedAddressId: null,
    shippingSnapshot: null,
    step: "CART_REVIEW",
  };
}

/**
 * Revalidate the authenticated customer's cart against live catalog/inventory.
 * Safe auto-fixes: reduce quantity to available stock when possible.
 * Blocking issues: missing/inactive/out-of-stock items remain until removed.
 */
export async function validateCheckoutCart(): Promise<{
  lines: CheckoutLine[];
  issues: CheckoutIssue[];
  currency: string;
  storeId: string | null;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      lines: [],
      issues: [
        {
          code: "UNAUTHORIZED",
          message: "Sign in to continue to Buy it now.",
        },
      ],
      currency: "INR",
      storeId: null,
    };
  }

  const storeId = await resolveActiveStoreId();
  if (!storeId) {
    return {
      lines: [],
      issues: [
        {
          code: "STORE_UNAVAILABLE",
          message: "Store is not configured.",
        },
      ],
      currency: "INR",
      storeId: null,
    };
  }

  const currency = await loadCurrency(storeId);
  const cart = await getCurrentCart();

  if (!cart.items.length) {
    return {
      lines: [],
      issues: [
        {
          code: "EMPTY_CART",
          message: "Your cart is empty.",
        },
      ],
      currency,
      storeId,
    };
  }

  if (cart.ownerKind !== "CUSTOMER" || cart.storeId !== storeId) {
    return {
      lines: [],
      issues: [
        {
          code: "UNAUTHORIZED",
          message: "Buy it now is only available for your store cart.",
        },
      ],
      currency,
      storeId,
    };
  }

  const supabase = await createSupabaseServerClient();
  const issues: CheckoutIssue[] = [];
  const lines: CheckoutLine[] = [];

  for (const item of cart.items) {
    const result = await validateLine(supabase, storeId, item, issues);
    if (result) lines.push(result);
  }

  return { lines, issues, currency, storeId };
}

async function validateLine(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  storeId: string,
  item: CartLineView,
  issues: CheckoutIssue[],
): Promise<CheckoutLine | null> {
  const validated = await validatePurchasableVariant(supabase, {
    storeId,
    productId: item.productId,
    variantId: item.variantId,
    requestedQuantity: item.quantity,
  });

  if (validated.ok) {
    return {
      ...item,
      unitPrice: validated.variant.unitPrice,
      currentUnitPrice: validated.variant.unitPrice,
      lineTotal: validated.variant.unitPrice * item.quantity,
      availability: "AVAILABLE",
      availableStock: validated.variant.availableStock,
      productName: validated.variant.productName,
      variantName: validated.variant.variantName,
      productSlug: validated.variant.productSlug,
    };
  }

  // Try quantity reduction when stock is the only problem.
  const probe = await validatePurchasableVariant(supabase, {
    storeId,
    productId: item.productId,
    variantId: item.variantId,
    requestedQuantity: 1,
  });

  if (
    probe.ok &&
    probe.variant.availableStock != null &&
    probe.variant.availableStock > 0 &&
    item.quantity > probe.variant.availableStock
  ) {
    const reduced = probe.variant.availableStock;
    await updateCartItemQuantity({
      cartItemId: item.id,
      quantity: reduced,
    });
    issues.push({
      code: "QUANTITY_REDUCED",
      message: `Quantity for ${item.productName} was reduced to ${reduced} based on available stock.`,
      cartItemId: item.id,
      productName: item.productName,
    });
    return {
      ...item,
      quantity: reduced,
      unitPrice: probe.variant.unitPrice,
      currentUnitPrice: probe.variant.unitPrice,
      lineTotal: probe.variant.unitPrice * reduced,
      availability: "AVAILABLE",
      availableStock: probe.variant.availableStock,
      productName: probe.variant.productName,
      variantName: probe.variant.variantName,
      productSlug: probe.variant.productSlug,
    };
  }

  const message = validated.error;
  let code: CheckoutIssue["code"] = "PRODUCT_UNAVAILABLE";
  if (/out of stock/i.test(message) || /available in stock/i.test(message)) {
    code = "OUT_OF_STOCK";
  } else if (/option is currently unavailable/i.test(message)) {
    code = "INACTIVE_VARIANT";
  } else if (/product is currently unavailable/i.test(message)) {
    code = "INACTIVE_PRODUCT";
  } else if (/no longer available/i.test(message) || /does not match/i.test(message)) {
    code = "MISSING_ITEM";
  }

  issues.push({
    code,
    message,
    cartItemId: item.id,
    productName: item.productName,
  });

  return {
    ...item,
    currentUnitPrice: item.unitPrice,
    availability:
      code === "OUT_OF_STOCK"
        ? "OUT_OF_STOCK"
        : code === "INACTIVE_PRODUCT" || code === "INACTIVE_VARIANT"
          ? "INACTIVE"
          : "MISSING",
  };
}

export async function getCheckoutSummary(input?: {
  selectedAddressId?: string | null;
  couponCode?: string | null;
}): Promise<CheckoutSummary> {
  const user = await getCurrentUser();
  if (!user) {
    return emptySummary("INR", [
      {
        code: "UNAUTHORIZED",
        message: "Sign in to continue to Buy it now.",
      },
    ]);
  }

  const [{ lines, issues, currency, storeId }, addresses] = await Promise.all([
    validateCheckoutCart(),
    getCustomerAddresses(),
  ]);

  let selectedAddressId: string | null =
    input?.selectedAddressId ??
    addresses.find((row) => row.isDefault)?.id ??
    addresses[0]?.id ??
    null;

  if (
    selectedAddressId &&
    !addresses.some((row) => row.id === selectedAddressId)
  ) {
    selectedAddressId = null;
  }

  let shippingSnapshot = null as CheckoutSummary["shippingSnapshot"];
  if (selectedAddressId) {
    const address =
      addresses.find((row) => row.id === selectedAddressId) ??
      (await getCustomerAddressById(selectedAddressId));
    if (address) {
      shippingSnapshot = toShippingAddressSnapshot(address);
    } else {
      selectedAddressId = null;
    }
  }

  const availableLines = lines.filter(
    (line) => line.availability === "AVAILABLE",
  );
  let pricing = null as CheckoutSummary["pricing"];
  let subtotal = 0;
  let couponCode: string | null = null;
  let couponMessage: string | null = null;
  const pricingIssues = [...issues];

  if (availableLines.length > 0 && storeId) {
    const priced = await calculateOrderPricingService({
      storeId,
      userId: user.id,
      couponCode: input?.couponCode ?? null,
      lines: availableLines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        unitPrice: line.currentUnitPrice,
        productName: line.productName,
        variantName: line.variantName,
      })),
      includeExtras: true,
    });
    if (priced.ok) {
      pricing = priced.pricing;
      subtotal = priced.pricing.subtotal.major;
      if (priced.pricing.discountInfo.code) {
        couponCode = priced.pricing.discountInfo.code;
      }
      if (priced.couponMessage) {
        couponMessage = priced.couponMessage;
      }
    } else {
      pricingIssues.push({
        code: "PRICING_FAILED",
        message: priced.error,
      });
    }
  } else if (input?.couponCode?.trim()) {
    couponMessage = "Add items to your cart before applying a coupon.";
  }

  const finalBlocking = pricingIssues.some((issue) =>
    isCheckoutBlockingIssue(issue.code),
  );
  const finalCanProceed =
    availableLines.length > 0 &&
    !finalBlocking &&
    lines.every((line) => line.availability === "AVAILABLE") &&
    pricing != null;

  return {
    storeId,
    currency,
    lines,
    itemCount: cartItemCount(lines),
    subtotal,
    pricing,
    couponCode,
    couponMessage,
    issues: pricingIssues,
    canProceed: finalCanProceed,
    addresses,
    selectedAddressId,
    shippingSnapshot,
    step: deriveCheckoutStep({
      canProceed: finalCanProceed,
      selectedAddressId,
    }),
  };
}

export async function removeCheckoutIssueItem(
  cartItemId: string,
  couponCode?: string | null,
): Promise<CheckoutSummary> {
  await removeFromCart(cartItemId);
  return getCheckoutSummary({ couponCode });
}
