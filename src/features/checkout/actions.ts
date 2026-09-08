"use server";

import { revalidatePath } from "next/cache";
import {
  getCheckoutSummary,
  removeCheckoutIssueItem,
} from "@/features/checkout/service";
import type { CheckoutSummary } from "@/features/checkout/types";
import { z } from "zod";

const selectAddressSchema = z.object({
  addressId: z.string().uuid("Invalid address."),
  couponCode: z.string().max(64).optional().nullable(),
});

const removeItemSchema = z.object({
  cartItemId: z.string().uuid("Invalid cart item."),
  couponCode: z.string().max(64).optional().nullable(),
});

const couponSchema = z.object({
  code: z.string().max(64),
  selectedAddressId: z.string().uuid().optional().nullable(),
});

const refreshSchema = z.object({
  selectedAddressId: z.string().uuid().optional().nullable(),
  couponCode: z.string().max(64).optional().nullable(),
});

function revalidateCheckoutPaths() {
  revalidatePath("/checkout");
  revalidatePath("/cart");
}

export async function getCheckoutSummaryAction(
  input?: {
    selectedAddressId?: string | null;
    couponCode?: string | null;
  },
): Promise<CheckoutSummary> {
  return getCheckoutSummary({
    selectedAddressId: input?.selectedAddressId,
    couponCode: input?.couponCode,
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
  });
}
