/**
 * Store phone helpers — national 10-digit numbers + configurable dial code.
 */

/** Common dial codes for Store Information. */
export const PHONE_COUNTRY_CODES = [
  { value: "+91", label: "+91 · India" },
  { value: "+971", label: "+971 · UAE" },
  { value: "+1", label: "+1 · US / Canada" },
  { value: "+44", label: "+44 · United Kingdom" },
  { value: "+65", label: "+65 · Singapore" },
] as const;

export const DEFAULT_PHONE_COUNTRY_CODE = "+91";
export const DEFAULT_STORE_COUNTRY = "India";

/** Digits only, max 10 — national number (no dial code). */
export function sanitizeNationalPhoneInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

/**
 * Normalize stored/pasted phones to 10 national digits.
 * Strips a leading country dial (e.g. 91) when length > 10.
 */
export function normalizeNationalPhone(
  raw: string | null | undefined,
  countryCode: string = DEFAULT_PHONE_COUNTRY_CODE,
): string {
  let digits = String(raw ?? "").replace(/\D/g, "");
  const dialDigits = (countryCode || DEFAULT_PHONE_COUNTRY_CODE).replace(
    /\D/g,
    "",
  );
  if (dialDigits && digits.length > 10 && digits.startsWith(dialDigits)) {
    digits = digits.slice(dialDigits.length);
  } else if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(-10);
  }
  return digits.slice(0, 10);
}

export function isValidNationalPhone(raw: string | null | undefined): boolean {
  const n = normalizeNationalPhone(raw);
  return n.length === 10;
}

/** Display: "+91 9876543210" */
export function formatPhoneDisplay(
  national: string | null | undefined,
  countryCode: string = DEFAULT_PHONE_COUNTRY_CODE,
): string | null {
  const n = normalizeNationalPhone(national, countryCode);
  if (!n) return null;
  const code =
    (countryCode || DEFAULT_PHONE_COUNTRY_CODE).trim() ||
    DEFAULT_PHONE_COUNTRY_CODE;
  return `${code} ${n}`;
}

/** tel:+919876543210 */
export function formatPhoneTelHref(
  national: string | null | undefined,
  countryCode: string = DEFAULT_PHONE_COUNTRY_CODE,
): string | null {
  const n = normalizeNationalPhone(national, countryCode);
  if (!n) return null;
  const codeDigits = (countryCode || DEFAULT_PHONE_COUNTRY_CODE).replace(
    /\D/g,
    "",
  );
  return `tel:+${codeDigits}${n}`;
}

export function normalizePhoneCountryCode(
  raw: string | null | undefined,
): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return DEFAULT_PHONE_COUNTRY_CODE;
  const withPlus = trimmed.startsWith("+")
    ? trimmed
    : `+${trimmed.replace(/\D/g, "")}`;
  const known = PHONE_COUNTRY_CODES.find((c) => c.value === withPlus);
  return (
    known?.value ??
    (withPlus.length >= 2 ? withPlus.slice(0, 5) : DEFAULT_PHONE_COUNTRY_CODE)
  );
}

/** Build storage value from national digits + dial code. */
export function formatPhoneForStorage(
  nationalDigits: string,
  countryCode: string = DEFAULT_PHONE_COUNTRY_CODE,
): string {
  const n = normalizeNationalPhone(nationalDigits, countryCode);
  const code =
    (countryCode || DEFAULT_PHONE_COUNTRY_CODE).trim() ||
    DEFAULT_PHONE_COUNTRY_CODE;
  return `${code}${n}`;
}
