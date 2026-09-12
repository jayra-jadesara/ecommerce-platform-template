import type { FieldErrors as RhfFieldErrors, UseFormSetError } from "react-hook-form";
import type { FieldErrors } from "@/lib/validation";

/**
 * Narrow fieldErrors off action results that may also be SafeFailure.
 */
export function resultFieldErrors(result: {
  ok: false;
  fieldErrors?: FieldErrors;
  [key: string]: unknown;
}): FieldErrors | undefined {
  if (!result.fieldErrors) return undefined;
  return result.fieldErrors;
}

/**
 * Apply server fieldErrors onto a React Hook Form instance.
 */
export function applyServerFieldErrors(
  setError: UseFormSetError<Record<string, unknown>>,
  fieldErrors: FieldErrors | undefined,
): void {
  if (!fieldErrors) return;
  for (const [path, message] of Object.entries(fieldErrors)) {
    if (!message || path === "_form") continue;
    setError(path as never, { type: "server", message });
  }
}

/** First field path from a FieldErrors map. */
export function firstFieldErrorKey(
  fieldErrors: FieldErrors | RhfFieldErrors | null | undefined,
): string | null {
  if (!fieldErrors) return null;
  for (const key of Object.keys(fieldErrors)) {
    if (key === "_form") continue;
    const value = (fieldErrors as Record<string, unknown>)[key];
    if (value) return key;
  }
  return null;
}

/**
 * Focus the first invalid control. Prefer RHF setFocus when available.
 */
export function focusFirstFieldError(options: {
  fieldErrors?: FieldErrors | null;
  setFocus?: (name: string) => void;
}): void {
  const key = firstFieldErrorKey(options.fieldErrors);
  if (!key) return;
  if (options.setFocus) {
    try {
      options.setFocus(key);
      return;
    } catch {
      // fall through to DOM
    }
  }
  if (typeof document === "undefined") return;
  const el =
    document.querySelector<HTMLElement>(`[name="${CSS.escape(key)}"]`) ??
    document.querySelector<HTMLElement>(`#${CSS.escape(key)}`);
  el?.focus?.();
  el?.scrollIntoView?.({ block: "center", behavior: "smooth" });
}
