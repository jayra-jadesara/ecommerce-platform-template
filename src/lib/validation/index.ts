import { z } from "zod";
import type { ZodError, ZodIssue } from "zod";

/**
 * Shared Admin validation primitives (Phase 28).
 * Business-friendly messages — no Postgres / framework jargon.
 */

const UNSAFE_URL_PROTOCOLS = /^(javascript|data|vbscript|file):/i;

/** Collapse accidental whitespace; empty after trim is empty. */
export function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

/** Reject blank and whitespace-only strings. */
export function isNonEmptyText(value: unknown): boolean {
  return normalizeText(value).length > 0;
}

/**
 * Required trimmed text. Rejects "", " ", tabs, newlines.
 * Stores the trimmed value.
 */
export function requiredText(
  label: string,
  options?: { max?: number; min?: number },
) {
  const max = options?.max ?? 500;
  const min = options?.min ?? 1;
  return z
    .string()
    .transform((v) => normalizeText(v))
    .pipe(
      z
        .string()
        .min(min, `${label} is required.`)
        .max(max, `${label} is too long.`),
    );
}

/** Optional trimmed text (empty string allowed). */
export function optionalText(options?: { max?: number }) {
  const max = options?.max ?? 2000;
  return z
    .string()
    .transform((v) => normalizeText(v))
    .pipe(z.string().max(max));
}

export const emailSchema = z
  .string()
  .transform((v) => normalizeText(v))
  .pipe(
    z
      .string()
      .max(254, "Email address is too long.")
      .email("Enter a valid email address."),
  );

export const optionalEmailSchema = z
  .string()
  .transform((v) => normalizeText(v))
  .pipe(
    z
      .string()
      .max(254)
      .refine((v) => !v || z.string().email().safeParse(v).success, {
        message: "Enter a valid email address.",
      }),
  );

export const optionalPhoneSchema = z
  .string()
  .transform((v) => normalizeText(v))
  .pipe(
    z
      .string()
      .max(40)
      .refine((v) => !v || /^[+0-9()\-\s.]{5,40}$/.test(v), {
        message: "Enter a valid phone number.",
      }),
  );

export function isSafeHttpUrl(value: string): boolean {
  const trimmed = normalizeText(value);
  if (!trimmed) return true;
  if (UNSAFE_URL_PROTOCOLS.test(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isSafeNavHref(value: string): boolean {
  const trimmed = normalizeText(value);
  if (!trimmed) return false;
  if (UNSAFE_URL_PROTOCOLS.test(trimmed)) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (trimmed.includes("\\") || trimmed.includes("\0")) return false;
    return true;
  }
  return isSafeHttpUrl(trimmed);
}

export const optionalSafeHttpUrlSchema = z
  .string()
  .transform((v) => normalizeText(v))
  .pipe(
    z
      .string()
      .max(2048)
      .refine((v) => isSafeHttpUrl(v), {
        message: "Enter a valid http(s) URL.",
      }),
  );

export const requiredSafeNavHrefSchema = z
  .string()
  .transform((v) => normalizeText(v))
  .pipe(
    z
      .string()
      .min(1, "URL is required.")
      .max(2048)
      .refine((v) => isSafeNavHref(v), {
        message: "Use an internal path or a valid http(s) URL.",
      }),
  );

export const nonNegativeNumberSchema = z.coerce
  .number({ invalid_type_error: "Enter a valid number." })
  .finite("Enter a valid number.")
  .min(0, "Value cannot be negative.");

export const percentageSchema = z.coerce
  .number({ invalid_type_error: "Enter a valid percentage." })
  .finite()
  .gt(0, "Percentage must be greater than 0.")
  .lte(100, "Percentage cannot exceed 100.");

export type FieldErrors = Record<string, string>;

export type ValidationFailure = {
  ok: false;
  kind: "validation";
  error: string;
  fieldErrors?: FieldErrors;
};

export type DependencyFailure = {
  ok: false;
  kind: "dependency";
  error: string;
  suggestion?: "archive" | "deactivate" | "disable";
  counts?: Record<string, number>;
};

export type MutationSuccess<T = undefined> = T extends undefined
  ? { ok: true; message?: string; id?: string }
  : { ok: true; message?: string; id?: string; data: T };

/** Flatten Zod issues into field → message (first issue per path). */
export function zodFieldErrors(error: ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function zodValidationFailure(
  error: ZodError,
  fallback = "Please check the highlighted fields.",
): ValidationFailure {
  const fieldErrors = zodFieldErrors(error);
  const first =
    error.issues[0]?.message ??
    Object.values(fieldErrors)[0] ??
    fallback;
  return {
    ok: false,
    kind: "validation",
    error: first,
    fieldErrors,
  };
}

export function firstZodMessage(
  issues: ZodIssue[],
  fallback = "Invalid input.",
): string {
  return issues[0]?.message ?? fallback;
}
