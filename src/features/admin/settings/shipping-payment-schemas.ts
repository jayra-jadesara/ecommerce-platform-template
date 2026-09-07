import { z } from "zod";

const nonNeg = z.coerce
  .number({ invalid_type_error: "Enter a valid number." })
  .finite("Enter a valid number.")
  .min(0, "Value cannot be negative.")
  .max(1_000_000_000, "Value is too large.");

const percent = z.coerce
  .number({ invalid_type_error: "Enter a valid percentage." })
  .finite("Enter a valid percentage.")
  .min(0, "Percentage cannot be negative.")
  .max(100, "Percentage cannot exceed 100.");

export const shippingSettingsSchema = z
  .object({
    enabled: z.coerce.boolean(),
    method: z.enum(["flat_rate", "free", "percentage", "zone"]),
    freeShippingThreshold: z.union([nonNeg, z.nan()]).optional().nullable(),
    defaultShippingFee: nonNeg,
    percentageRate: z.union([percent, z.nan()]).optional().nullable(),
    estimatedDeliveryMinDays: z.coerce
      .number()
      .int()
      .min(0)
      .max(365)
      .optional()
      .nullable(),
    estimatedDeliveryMaxDays: z.coerce
      .number()
      .int()
      .min(0)
      .max(365)
      .optional()
      .nullable(),
    estimatedDeliveryLabel: z.string().max(120).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    const min = value.estimatedDeliveryMinDays;
    const max = value.estimatedDeliveryMaxDays;
    if (
      min != null &&
      max != null &&
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      max < min
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Max delivery days must be >= min days.",
        path: ["estimatedDeliveryMaxDays"],
      });
    }
  })
  .transform((value) => ({
    ...value,
    freeShippingThreshold:
      value.freeShippingThreshold == null ||
      Number.isNaN(value.freeShippingThreshold)
        ? null
        : value.freeShippingThreshold,
    percentageRate:
      value.percentageRate == null || Number.isNaN(value.percentageRate)
        ? null
        : value.percentageRate,
    estimatedDeliveryMinDays:
      value.estimatedDeliveryMinDays == null ||
      Number.isNaN(value.estimatedDeliveryMinDays)
        ? null
        : value.estimatedDeliveryMinDays,
    estimatedDeliveryMaxDays:
      value.estimatedDeliveryMaxDays == null ||
      Number.isNaN(value.estimatedDeliveryMaxDays)
        ? null
        : value.estimatedDeliveryMaxDays,
    estimatedDeliveryLabel: value.estimatedDeliveryLabel?.trim() || null,
  }));

export type ShippingSettingsFormValues = z.infer<typeof shippingSettingsSchema>;

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettingsFormValues = {
  enabled: true,
  method: "flat_rate",
  freeShippingThreshold: 500,
  defaultShippingFee: 50,
  percentageRate: null,
  estimatedDeliveryMinDays: null,
  estimatedDeliveryMaxDays: null,
  estimatedDeliveryLabel: null,
};

export const paymentSettingsSchema = z
  .object({
    provider: z.enum(["none", "razorpay", "other"]),
    feeEnabled: z.coerce.boolean(),
    feeType: z.enum(["PERCENTAGE", "FIXED"]),
    feeValue: z.coerce
      .number()
      .finite()
      .min(0)
      .max(1_000_000_000),
    feeBasis: z.enum([
      "SUBTOTAL",
      "SUBTOTAL_PLUS_SHIPPING",
      "ORDER_TOTAL_BEFORE_PAYMENT_FEE",
    ]),
    taxEnabled: z.coerce.boolean(),
    taxType: z.enum(["PERCENTAGE", "FIXED"]),
    taxValue: z.coerce.number().finite().min(0).max(1_000_000_000),
  })
  .superRefine((value, ctx) => {
    if (value.feeType === "PERCENTAGE" && value.feeValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fee percentage cannot exceed 100.",
        path: ["feeValue"],
      });
    }
    if (value.taxType === "PERCENTAGE" && value.taxValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tax percentage cannot exceed 100.",
        path: ["taxValue"],
      });
    }
  });

export type PaymentSettingsFormValues = z.infer<typeof paymentSettingsSchema>;

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettingsFormValues = {
  provider: "none",
  feeEnabled: false,
  feeType: "PERCENTAGE",
  feeValue: 0,
  feeBasis: "SUBTOTAL_PLUS_SHIPPING",
  taxEnabled: false,
  taxType: "PERCENTAGE",
  taxValue: 0,
};
