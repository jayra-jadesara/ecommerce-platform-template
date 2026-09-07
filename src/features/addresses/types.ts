export type CustomerAddress = {
  id: string;
  fullName: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AddressMutationResult =
  | { ok: true; address?: CustomerAddress; addresses: CustomerAddress[]; message?: string }
  | { ok: false; error: string };

/**
 * Immutable shipping snapshot for future order history.
 * Orders must store this copy — not only an address_id.
 */
export type ShippingAddressSnapshot = {
  fullName: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
};

export function toShippingAddressSnapshot(
  address: CustomerAddress,
): ShippingAddressSnapshot {
  return {
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };
}

/**
 * Delete default behavior: if the deleted address was default and others remain,
 * promote the most recently updated remaining address to default.
 * If none remain, leave no default.
 */
export function chooseNextDefaultAddressId(
  remaining: Array<{ id: string; updatedAt: string }>,
): string | null {
  if (!remaining.length) return null;
  const sorted = [...remaining].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
  );
  return sorted[0]?.id ?? null;
}

/** Cross-user access must be rejected when session user differs from owner. */
export function assertAddressOwner(
  addressUserId: string,
  sessionUserId: string,
): boolean {
  return addressUserId === sessionUserId;
}
