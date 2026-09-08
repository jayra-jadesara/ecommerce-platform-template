import { z } from "zod";
import { normalizeCouponCode } from "@/features/coupons/normalize";

const optionalPositiveNumber = z
  .union([z.number(), z.nan(), z.null(), z.undefined(), z.literal("")])
  .transform((v) => {
    if (v === "" || v == null || (typeof v === "number" && Number.isNaN(v))) {
      return null;
    }
    return typeof v === "number" ? v : Number(v);
  })
  .pipe(z.number().nonnegative().nullable());

const optionalPositiveInt = z
  .union([z.number(), z.nan(), z.null(), z.undefined(), z.literal("")])
  .transform((v) => {
    if (v === "" || v == null || (typeof v === "number" && Number.isNaN(v))) {
      return null;
    }
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  })
  .pipe(z.number().int().positive().nullable());

const optionalDateTime = z
  .union([z.string(), z.null(), z.undefined(), z.literal("")])
  .transform((v) => {
    if (v == null || v === "") return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  });

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .min(1, "Enter a coupon code.")
      .max(64, "Code is too long.")
      .transform(normalizeCouponCode)
      .refine((c) => /^[A-Z0-9_-]+$/.test(c), {
        message: "Use letters, numbers, hyphens, or underscores only.",
      }),
    description: z
      .union([z.string(), z.null(), z.undefined()])
      .optional()
      .transform((v) => {
        if (v == null) return null;
        const trimmed = v.trim();
        return trimmed ? trimmed.slice(0, 500) : null;
      }),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z.coerce
      .number({ message: "Enter a discount value." })
      .positive("Discount must be greater than zero."),
    minimumOrderAmount: optionalPositiveNumber,
    maximumDiscountAmount: optionalPositiveNumber,
    usageLimit: optionalPositiveInt,
    perUserLimit: optionalPositiveInt,
    startsAt: optionalDateTime,
    expiresAt: optionalDateTime,
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === "percentage" && data.discountValue > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Percentage cannot exceed 100.",
      });
    }
    if (
      data.startsAt &&
      data.expiresAt &&
      new Date(data.expiresAt).getTime() < new Date(data.startsAt).getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "Expiry must be on or after the start date.",
      });
    }
    if (
      data.discountType === "fixed" &&
      data.maximumDiscountAmount != null
    ) {
      // Max discount is meaningful for percentage; ignore for fixed or warn softly.
    }
  });

export type CouponFormValues = z.infer<typeof couponFormSchema>;

export const couponListQuerySchema = z.object({
  q: z.string().optional().default(""),
  status: z
    .enum(["all", "active", "inactive", "scheduled", "expired", "exhausted"])
    .optional()
    .default("all"),
  sort: z
    .enum(["newest", "oldest", "code", "code_desc", "expiry"])
    .optional()
    .default("newest"),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(20),
});

export type CouponListQuery = z.infer<typeof couponListQuerySchema>;

export const DEFAULT_COUPON_FORM: CouponFormValues = {
  code: "",
  description: null,
  discountType: "percentage",
  discountValue: 10,
  minimumOrderAmount: null,
  maximumDiscountAmount: null,
  usageLimit: null,
  perUserLimit: null,
  startsAt: null,
  expiresAt: null,
  isActive: true,
};
