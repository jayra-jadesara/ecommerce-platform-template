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
});

const removeItemSchema = z.object({
  cartItemId: z.string().uuid("Invalid cart item."),
});

function revalidateCheckoutPaths() {
  revalidatePath("/checkout");
  revalidatePath("/cart");
}

export async function getCheckoutSummaryAction(
  selectedAddressId?: string | null,
): Promise<CheckoutSummary> {
  return getCheckoutSummary({ selectedAddressId });
}

export async function selectCheckoutAddressAction(
  raw: unknown,
): Promise<CheckoutSummary> {
  const parsed = selectAddressSchema.safeParse(raw);
  if (!parsed.success) {
    return getCheckoutSummary({ selectedAddressId: null });
  }
  return getCheckoutSummary({ selectedAddressId: parsed.data.addressId });
}

export async function removeCheckoutItemAction(
  raw: unknown,
): Promise<CheckoutSummary> {
  const parsed = removeItemSchema.safeParse(raw);
  if (!parsed.success) {
    return getCheckoutSummary();
  }
  const summary = await removeCheckoutIssueItem(parsed.data.cartItemId);
  revalidateCheckoutPaths();
  return summary;
}
