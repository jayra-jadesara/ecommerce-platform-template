import "server-only";

import { requireUser } from "@/features/auth/session";
import {
  chooseNextDefaultAddressId,
  type AddressMutationResult,
  type CustomerAddress,
} from "@/features/addresses/types";
import type { AddressFormInput } from "@/features/addresses/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

function friendlyError(): string {
  return "Something went wrong with your address book. Please try again.";
}

function mapAddress(row: Tables<"user_addresses">): CustomerAddress {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listForUser(userId: string): Promise<CustomerAddress[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapAddress);
}

async function clearDefaults(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("user_addresses")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);
  return !error;
}

export async function getCustomerAddresses(): Promise<CustomerAddress[]> {
  const user = await requireUser();
  return listForUser(user.id);
}

export async function getCustomerAddressById(
  addressId: string,
): Promise<CustomerAddress | null> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("id", addressId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return mapAddress(data);
}

export async function createCustomerAddress(
  input: AddressFormInput,
): Promise<AddressMutationResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const existing = await listForUser(user.id);
  const makeDefault = Boolean(input.isDefault) || existing.length === 0;

  if (makeDefault) {
    const cleared = await clearDefaults(user.id);
    if (!cleared) return { ok: false, error: friendlyError() };
  }

  const { data, error } = await supabase
    .from("user_addresses")
    .insert({
      user_id: user.id,
      full_name: input.fullName,
      phone: input.phone,
      address_line_1: input.addressLine1,
      address_line_2: input.addressLine2,
      city: input.city,
      state: input.state,
      postal_code: input.postalCode,
      country: input.country,
      is_default: makeDefault,
    })
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: friendlyError() };

  const addresses = await listForUser(user.id);
  return {
    ok: true,
    address: mapAddress(data),
    addresses,
    message: "Address saved.",
  };
}

export async function updateCustomerAddress(
  addressId: string,
  input: AddressFormInput,
): Promise<AddressMutationResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("user_addresses")
    .select("id, is_default")
    .eq("id", addressId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Address not found." };
  }

  const makeDefault = Boolean(input.isDefault);
  if (makeDefault) {
    const cleared = await clearDefaults(user.id);
    if (!cleared) return { ok: false, error: friendlyError() };
  }

  const { data, error } = await supabase
    .from("user_addresses")
    .update({
      full_name: input.fullName,
      phone: input.phone,
      address_line_1: input.addressLine1,
      address_line_2: input.addressLine2,
      city: input.city,
      state: input.state,
      postal_code: input.postalCode,
      country: input.country,
      is_default: makeDefault,
    })
    .eq("id", addressId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: friendlyError() };

  const addresses = await listForUser(user.id);
  return {
    ok: true,
    address: mapAddress(data),
    addresses,
    message: "Address updated.",
  };
}

export async function deleteCustomerAddress(
  addressId: string,
): Promise<AddressMutationResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("user_addresses")
    .select("id, is_default")
    .eq("id", addressId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Address not found." };
  }

  const { error } = await supabase
    .from("user_addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: friendlyError() };

  let addresses = await listForUser(user.id);

  if (existing.is_default) {
    const nextId = chooseNextDefaultAddressId(
      addresses.map((row) => ({ id: row.id, updatedAt: row.updatedAt })),
    );
    if (nextId) {
      await supabase
        .from("user_addresses")
        .update({ is_default: true })
        .eq("id", nextId)
        .eq("user_id", user.id);
      addresses = await listForUser(user.id);
    }
  }

  return {
    ok: true,
    addresses,
    message: "Address removed.",
  };
}

export async function setDefaultAddress(
  addressId: string,
): Promise<AddressMutationResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("user_addresses")
    .select("id")
    .eq("id", addressId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Address not found." };
  }

  const cleared = await clearDefaults(user.id);
  if (!cleared) return { ok: false, error: friendlyError() };

  const { data, error } = await supabase
    .from("user_addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: friendlyError() };

  const addresses = await listForUser(user.id);
  return {
    ok: true,
    address: mapAddress(data),
    addresses,
    message: "Default address updated.",
  };
}
