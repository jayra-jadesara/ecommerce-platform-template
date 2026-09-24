import { z } from "zod";
import {
  isRecoveryQuestionId,
  RECOVERY_QUESTION_IDS,
} from "@/features/auth/recovery-questions";
import { DEFAULT_PHONE_COUNTRY_CODE } from "@/lib/phone";

/** Required email with clear empty + format messages (shown on blur in forms). */
export const authEmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254, "Email address is too long")
  .email("Enter a valid email address")
  .refine(
    (value) => /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(value),
    "Enter a valid email address (e.g. name@example.com)",
  );

/**
 * Fallback dial code when Store Information is unavailable.
 * Prefer `store.phoneCountryCode` from platform config in UI + actions.
 */
export const REGISTER_COUNTRY_CODE = DEFAULT_PHONE_COUNTRY_CODE;

/** 10-digit national mobile (without dial code) — shown as account number in UI. */
export const registerPhoneSchema = z
  .string()
  .trim()
  .min(1, "Enter your account number")
  .regex(/^\d{10}$/, "Enter a valid 10-digit account number");

export const recoveryQuestionIdSchema = z.enum(RECOVERY_QUESTION_IDS, {
  required_error: "Select a security question",
  invalid_type_error: "Select a security question",
});

export const recoveryAnswerSchema = z
  .string()
  .trim()
  .min(2, "Answer must be at least 2 characters")
  .max(120, "Answer is too long");

export const loginSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(80),
    lastName: z.string().trim().min(1, "Last name is required").max(80),
    email: authEmailSchema,
    phone: registerPhoneSchema,
    recoveryQuestionId: recoveryQuestionIdSchema,
    recoveryAnswer: recoveryAnswerSchema,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Step 1: verify identity for in-app password reset. */
export const forgotPasswordSchema = z.object({
  email: authEmailSchema,
  phone: registerPhoneSchema,
  recoveryQuestionId: recoveryQuestionIdSchema,
  recoveryAnswer: recoveryAnswerSchema,
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Signed-in user changing their own password (admin or storefront). */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.password !== data.currentPassword, {
    message: "New password must be different from your current password",
    path: ["password"],
  });

export const profileUpdateSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(80),
    lastName: z.string().trim().min(1, "Last name is required").max(80),
    phone: registerPhoneSchema,
    recoveryQuestionId: z.string().optional(),
    recoveryAnswer: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const q = data.recoveryQuestionId?.trim() ?? "";
    const a = data.recoveryAnswer?.trim() ?? "";
    // Empty answer = leave recovery unchanged.
    if (!a) return;
    if (!isRecoveryQuestionId(q)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a security question",
        path: ["recoveryQuestionId"],
      });
    }
    if (a.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Answer must be at least 2 characters",
        path: ["recoveryAnswer"],
      });
    }
    if (a.length > 120) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Answer is too long",
        path: ["recoveryAnswer"],
      });
    }
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
