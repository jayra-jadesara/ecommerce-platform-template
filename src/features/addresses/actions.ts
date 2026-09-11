"use server";

import { revalidatePath } from "next/cache";
import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  setDefaultAddress,
  updateCustomerAddress,
} from "@/features/addresses/service";
import type { AddressMutationResult, CustomerAddress } from "@/features/addresses/types";
import {
  addressFormSchema,
  addressIdSchema,
} from "@/features/addresses/validation";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";

function revalidateAddressPaths() {
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}

export async function listAddressesAction(): Promise<CustomerAddress[]> {
  return getCustomerAddresses();
}

export async function createAddressAction(
  raw: unknown,
): Promise<AddressMutationResult> {
  const parsed = addressFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid address.",
    };
  }

  const result = await runLoggedMutation(
    {
      type: "AUTH",
      source: "SERVER",
      operation: "CREATE_ADDRESS",
      feature: "AUTH",
      entityType: "user_address",
      route: "/account/addresses",
    },
    () => createCustomerAddress(parsed.data),
  );
  if (result.ok) revalidateAddressPaths();
  return result;
}

export async function updateAddressAction(
  addressId: string,
  raw: unknown,
): Promise<AddressMutationResult> {
  const idParsed = addressIdSchema.safeParse({ addressId });
  if (!idParsed.success) {
    return { ok: false, error: "Invalid address." };
  }
  const parsed = addressFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid address.",
    };
  }

  const result = await runLoggedMutation(
    {
      type: "AUTH",
      source: "SERVER",
      operation: "UPDATE_ADDRESS",
      feature: "AUTH",
      entityType: "user_address",
      entityId: idParsed.data.addressId,
      route: "/account/addresses",
    },
    () => updateCustomerAddress(idParsed.data.addressId, parsed.data),
  );
  if (result.ok) revalidateAddressPaths();
  return result;
}

export async function deleteAddressAction(
  raw: unknown,
): Promise<AddressMutationResult> {
  const parsed = addressIdSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid address." };
  }

  const result = await runLoggedMutation(
    {
      type: "AUTH",
      source: "SERVER",
      operation: "DELETE_ADDRESS",
      feature: "AUTH",
      entityType: "user_address",
      entityId: parsed.data.addressId,
      route: "/account/addresses",
    },
    () => deleteCustomerAddress(parsed.data.addressId),
  );
  if (result.ok) revalidateAddressPaths();
  return result;
}

export async function setDefaultAddressAction(
  raw: unknown,
): Promise<AddressMutationResult> {
  const parsed = addressIdSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid address." };
  }

  const result = await runLoggedMutation(
    {
      type: "AUTH",
      source: "SERVER",
      operation: "SET_DEFAULT_ADDRESS",
      feature: "AUTH",
      entityType: "user_address",
      entityId: parsed.data.addressId,
      route: "/account/addresses",
    },
    () => setDefaultAddress(parsed.data.addressId),
  );
  if (result.ok) revalidateAddressPaths();
  return result;
}
