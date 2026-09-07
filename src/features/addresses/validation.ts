import { z } from "zod";

/** Strip control chars / obvious script payloads; keep international text. */
function sanitizePlainText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

const plainText = (min: number, max: number, label: string) =>
  z
    .string()
    .transform(sanitizePlainText)
    .pipe(
      z
        .string()
        .min(min, `${label} is required.`)
        .max(max, `${label} is too long.`),
    );

const optionalPlainText = (max: number, label: string) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((value) => {
      if (value == null) return null;
      const cleaned = sanitizePlainText(value);
      return cleaned.length ? cleaned : null;
    })
    .refine((value) => value == null || value.length <= max, {
      message: `${label} is too long.`,
    });

/** Flexible phone: digits, spaces, +, -, (), 7–20 significant digits. */
export const phoneSchema = z
  .string()
  .optional()
  .nullable()
  .transform((value) => {
    if (value == null) return null;
    const cleaned = sanitizePlainText(value);
    return cleaned.length ? cleaned : null;
  })
  .refine(
    (value) => {
      if (value == null) return true;
      if (value.length > 32) return false;
      const digits = value.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    },
    { message: "Enter a valid phone number." },
  );

/** Postal codes vary widely — require non-empty alphanumeric-ish text. */
export const postalCodeSchema = z
  .string()
  .transform(sanitizePlainText)
  .pipe(
    z
      .string()
      .min(2, "Postal code is required.")
      .max(20, "Postal code is too long.")
      .regex(/^[A-Za-z0-9][A-Za-z0-9\s\-]*$/, "Enter a valid postal code."),
  );

export const addressFormSchema = z.object({
  fullName: plainText(2, 120, "Full name"),
  phone: phoneSchema,
  addressLine1: plainText(3, 200, "Address line 1"),
  addressLine2: optionalPlainText(200, "Address line 2"),
  city: plainText(2, 100, "City"),
  state: optionalPlainText(100, "State"),
  postalCode: postalCodeSchema,
  country: plainText(2, 100, "Country"),
  isDefault: z.coerce.boolean().optional().default(false),
});

export const addressIdSchema = z.object({
  addressId: z.string().uuid("Invalid address."),
});

export type AddressFormInput = z.infer<typeof addressFormSchema>;
