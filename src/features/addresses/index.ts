export type {
  CustomerAddress,
  AddressMutationResult,
  ShippingAddressSnapshot,
} from "@/features/addresses/types";
export {
  toShippingAddressSnapshot,
  chooseNextDefaultAddressId,
  assertAddressOwner,
} from "@/features/addresses/types";
export {
  addressFormSchema,
  addressIdSchema,
  phoneSchema,
  postalCodeSchema,
  type AddressFormInput,
} from "@/features/addresses/validation";
