"use server";

import { revalidatePath } from "next/cache";
import {
  getCheckoutSummary,
  removeCheckoutIssueItem,
} from "@/features/checkout/service";
import type { CheckoutPaymentMethod, CheckoutSummary } from "@/features/checkout/types";
import { z } from "zod";

const paymentMethodSchema = z.enum(["razorpay", "cod"]).optional().nullable();

const selectAddressSchema = z.object({
  addressId: z.string().uuid("Invalid address."),
  couponCode: z.string().max(64).optional().nullable(),
  paymentMethod: paymentMethodSchema,
});

const removeItemSchema = z.object({
  cartItemId: z.string().uuid("Invalid cart item."),
  couponCode: z.string().max(64).optional().nullable(),
  paymentMethod: paymentMethodSchema,
});

const couponSchema = z.object({
  code: z.string().max(64),
  selectedAddressId: z.string().uuid().optional().nullable(),
  paymentMethod: paymentMethodSchema,
});

const refreshSchema = z.object({
  selectedAddressId: z.string().uuid().optional().nullable(),
  couponCode: z.string().max(64).optional().nullable(),
  paymentMethod: paymentMethodSchema,
});

function revalidateCheckoutPaths() {
  revalidatePath("/checkout");
  revalidatePath("/cart");
}

export async function getCheckoutSummaryAction(input?: {
  selectedAddressId?: string | null;
  couponCode?: string | null;
  paymentMethod?: CheckoutPaymentMethod | null;
}): Promise<CheckoutSummary> {
  return getCheckoutSummary({
    selectedAddressId: input?.selectedAddressId,
    couponCode: input?.couponCode,
    paymentMethod: input?.paymentMethod,
  });
}

export async function selectCheckoutAddressAction(
  raw: unknown,
): Promise<CheckoutSummary> {
  const parsed = selectAddressSchema.safeParse(raw);
  if (!parsed.success) {
    return getCheckoutSummary({ selectedAddressId: null });
  }
  return getCheckoutSummary({
    selectedAddressId: parsed.data.addressId,
    couponCode: parsed.data.couponCode,
    paymentMethod: parsed.data.paymentMethod,
  });
}

export async function removeCheckoutItemAction(
  raw: unknown,
): Promise<CheckoutSummary> {
  const parsed = removeItemSchema.safeParse(raw);
  if (!parsed.success) {
    return getCheckoutSummary();
  }
  const summary = await removeCheckoutIssueItem(
    parsed.data.cartItemId,
    parsed.data.couponCode,
  );
  revalidateCheckoutPaths();
  if (parsed.data.paymentMethod) {
    return getCheckoutSummary({
      couponCode: summary.couponCode,
      paymentMethod: parsed.data.paymentMethod,
      selectedAddressId: summary.selectedAddressId,
    });
  }
  return summary;
}

/** Validate + apply coupon for checkout preview (does not redeem). */
export async function applyCheckoutCouponAction(
  raw: unknown,
): Promise<CheckoutSummary> {
  const parsed = couponSchema.safeParse(raw);
  if (!parsed.success) {
    return getCheckoutSummary();
  }
  return getCheckoutSummary({
    selectedAddressId: parsed.data.selectedAddressId,
    couponCode: parsed.data.code,
    paymentMethod: parsed.data.paymentMethod,
  });
}

export async function removeCheckoutCouponAction(
  raw: unknown,
): Promise<CheckoutSummary> {
  const parsed = refreshSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return getCheckoutSummary({ couponCode: null });
  }
  return getCheckoutSummary({
    selectedAddressId: parsed.data.selectedAddressId,
    couponCode: null,
    paymentMethod: parsed.data.paymentMethod,
  });
}

export async function setCheckoutPaymentMethodAction(
  raw: unknown,
): Promise<CheckoutSummary> {
  const parsed = refreshSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return getCheckoutSummary();
  }
  return getCheckoutSummary({
    selectedAddressId: parsed.data.selectedAddressId,
    couponCode: parsed.data.couponCode,
    paymentMethod: parsed.data.paymentMethod,
  });
}
