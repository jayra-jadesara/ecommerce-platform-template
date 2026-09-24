import { getPlatformConfigAsync } from "@/config/site.server";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  DEFAULT_STORE_COUNTRY,
  normalizePhoneCountryCode,
} from "@/lib/phone";

/** Dial code + country from Store Information (server). */
export async function getStoreLocationDefaults(): Promise<{
  phoneCountryCode: string;
  country: string;
}> {
  const { store, contact } = await getPlatformConfigAsync();
  return {
    phoneCountryCode: normalizePhoneCountryCode(
      store.phoneCountryCode ||
        contact.phoneCountryCode ||
        DEFAULT_PHONE_COUNTRY_CODE,
    ),
    country: contact.country?.trim() || DEFAULT_STORE_COUNTRY,
  };
}

export async function getStoreCountry(): Promise<string> {
  const { country } = await getStoreLocationDefaults();
  return country;
}

export async function getStorePhoneCountryCode(): Promise<string> {
  const { phoneCountryCode } = await getStoreLocationDefaults();
  return phoneCountryCode;
}
