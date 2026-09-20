/** Client-safe phone normalization (no Node crypto). */

export function normalizePhoneForCompare(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (phone.trim().startsWith("+")) return `+${digits}`;
  return phone.trim();
}

/** Strip +91 / leading 91 for form display (10 national digits). */
export function toNationalMobileDigits(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 10) return digits;
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}
