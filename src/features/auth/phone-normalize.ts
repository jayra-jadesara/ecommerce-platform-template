import {
  DEFAULT_PHONE_COUNTRY_CODE,
  normalizeNationalPhone,
  normalizePhoneCountryCode,
} from "@/lib/phone";

/** Client-safe phone normalization (no Node crypto). */

export function normalizePhoneForCompare(
  phone: string,
  countryCode: string = DEFAULT_PHONE_COUNTRY_CODE,
): string {
  const code = normalizePhoneCountryCode(countryCode);
  const dialDigits = code.replace(/\D/g, "");
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `${code}${digits}`;
  if (dialDigits && digits.startsWith(dialDigits) && digits.length > 10) {
    return `+${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (phone.trim().startsWith("+")) return `+${digits}`;
  return phone.trim();
}

/** Strip dial code / leading country digits for form display (10 national digits). */
export function toNationalMobileDigits(
  phone: string | null | undefined,
  countryCode: string = DEFAULT_PHONE_COUNTRY_CODE,
): string {
  return normalizeNationalPhone(phone, countryCode);
}
