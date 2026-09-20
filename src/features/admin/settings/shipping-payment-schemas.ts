import { z } from "zod";
import {
  DEFAULT_CANCEL_REASON_OPTIONS,
  DEFAULT_REPLACE_REASON_OPTIONS,
  FULFILLMENT_MODES,
  REPLACE_WINDOW_HOURS,
  RETURN_POLICIES,
  coerceCancelReasonOptions,
  coerceReplaceReasonOptions,
} from "@/features/shipping/policies";

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
    fulfillmentMode: z.enum(FULFILLMENT_MODES),
    /** Used when fulfillmentMode is auto_days */
    autoDeliverAfterDays: z
      .union([
        z.coerce.number().int().min(1).max(60),
        z.nan(),
        z.null(),
        z.literal(""),
      ])
      .optional()
      .nullable(),
    returnPolicy: z.enum(RETURN_POLICIES),
    /** When true, replace requests require a photo (uses storage). Default false. */
    replacePhotoRequired: z.coerce.boolean(),
    replaceWindowHours: z.coerce
      .number()
      .refine(
        (value) => (REPLACE_WINDOW_HOURS as readonly number[]).includes(value),
        "Choose 24, 48, 72, or 168 hours.",
      ),
    replaceMaxAttempts: z.coerce.number().int().min(1).max(5),
    replaceReasonOptions: z
      .array(z.string().trim().min(1).max(80))
      .min(1)
      .max(12),
    cancelReasonOptions: z
      .array(z.string().trim().min(1).max(80))
      .min(1)
      .max(12),
    courierDefaultProvider: z
      .enum(["delhivery", "bluedart"])
      .nullable()
      .optional(),
    courierSandbox: z.coerce.boolean(),
    delhiveryApiToken: z.string().max(500).optional().nullable(),
    delhiveryClientName: z.string().max(120).optional().nullable(),
    bluedartLoginId: z.string().max(120).optional().nullable(),
    bluedartLicenceKey: z.string().max(500).optional().nullable(),
    bluedartApiKey: z.string().max(500).optional().nullable(),
    bluedartApiSecret: z.string().max(500).optional().nullable(),
    bluedartOriginArea: z.string().max(40).optional().nullable(),
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

    if (value.fulfillmentMode === "auto_days") {
      const days = value.autoDeliverAfterDays;
      const empty =
        days == null ||
        days === "" ||
        (typeof days === "number" && Number.isNaN(days));
      if (empty) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter how many days after shipping (1–60).",
          path: ["autoDeliverAfterDays"],
        });
      }
    }

    if (value.returnPolicy === "replace_only") {
      const options = coerceReplaceReasonOptions(value.replaceReasonOptions);
      if (options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add at least one reason plus Other.",
          path: ["replaceReasonOptions"],
        });
      }
    }

    const cancelOptions = coerceCancelReasonOptions(value.cancelReasonOptions);
    if (cancelOptions.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one cancel reason plus Other.",
        path: ["cancelReasonOptions"],
      });
    }
  })
  .transform((value) => {
    const autoDays =
      value.autoDeliverAfterDays == null ||
      value.autoDeliverAfterDays === "" ||
      Number.isNaN(value.autoDeliverAfterDays as number)
        ? null
        : Number(value.autoDeliverAfterDays);

    const replaceOnly = value.returnPolicy === "replace_only";

    return {
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
      autoDeliverAfterDays:
        value.fulfillmentMode === "auto_days" ? autoDays : null,
      replacePhotoRequired: replaceOnly
        ? Boolean(value.replacePhotoRequired)
        : false,
      replaceWindowHours: replaceOnly ? value.replaceWindowHours : 72,
      replaceMaxAttempts: replaceOnly ? value.replaceMaxAttempts : 1,
      replaceReasonOptions: replaceOnly
        ? coerceReplaceReasonOptions(value.replaceReasonOptions)
        : [...DEFAULT_REPLACE_REASON_OPTIONS],
      cancelReasonOptions: coerceCancelReasonOptions(value.cancelReasonOptions),
      courierDefaultProvider:
        value.fulfillmentMode === "courier_api"
          ? value.courierDefaultProvider === "bluedart"
            ? "bluedart"
            : "delhivery"
          : null,
      courierSandbox: Boolean(value.courierSandbox),
      delhiveryApiToken: value.delhiveryApiToken?.trim() || null,
      delhiveryClientName: value.delhiveryClientName?.trim() || null,
      bluedartLoginId: value.bluedartLoginId?.trim() || null,
      bluedartLicenceKey: value.bluedartLicenceKey?.trim() || null,
      bluedartApiKey: value.bluedartApiKey?.trim() || null,
      bluedartApiSecret: value.bluedartApiSecret?.trim() || null,
      bluedartOriginArea: value.bluedartOriginArea?.trim() || null,
    };
  });

export type ShippingSettingsFormValues = z.infer<typeof shippingSettingsSchema>;

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettingsFormValues = {
  enabled: true,
  method: "flat_rate",
  freeShippingThreshold: 500,
  defaultShippingFee: 50,
  percentageRate: null,
  estimatedDeliveryMinDays: 3,
  estimatedDeliveryMaxDays: 7,
  estimatedDeliveryLabel: null,
  fulfillmentMode: "auto_days",
  autoDeliverAfterDays: 7,
  returnPolicy: "no_return_refund",
  replacePhotoRequired: false,
  replaceWindowHours: 72,
  replaceMaxAttempts: 1,
  replaceReasonOptions: [...DEFAULT_REPLACE_REASON_OPTIONS],
  cancelReasonOptions: [...DEFAULT_CANCEL_REASON_OPTIONS],
  courierDefaultProvider: "delhivery",
  courierSandbox: true,
  delhiveryApiToken: null,
  delhiveryClientName: null,
  bluedartLoginId: null,
  bluedartLicenceKey: null,
  bluedartApiKey: null,
  bluedartApiSecret: null,
  bluedartOriginArea: null,
};

export const paymentSettingsSchema = z
  .object({
    razorpayEnabled: z.coerce.boolean(),
    codEnabled: z.coerce.boolean(),
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
  razorpayEnabled: false,
  codEnabled: false,
  feeEnabled: false,
  feeType: "PERCENTAGE",
  feeValue: 0,
  feeBasis: "SUBTOTAL_PLUS_SHIPPING",
  taxEnabled: false,
  taxType: "PERCENTAGE",
  taxValue: 0,
};

/** Synced legacy provider column for older readers. */
export function syncedPaymentProvider(
  values: Pick<PaymentSettingsFormValues, "razorpayEnabled">,
): "razorpay" | "none" {
  return values.razorpayEnabled ? "razorpay" : "none";
}
