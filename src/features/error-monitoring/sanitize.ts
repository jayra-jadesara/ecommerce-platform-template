import { LIMITS } from "@/features/error-monitoring/types";

const SECRET_KEY_PATTERN =
  /(password|passwd|secret|token|authorization|cookie|api[_-]?key|service[_-]?role|webhook[_-]?secret|razorpay[_-]?(secret|key)|refresh[_-]?token|access[_-]?token|card[_-]?number|cvv|cvc|upi[_-]?pin|bank)/i;

const SECRET_VALUE_PATTERN =
  /(Bearer\s+[A-Za-z0-9\-._~+/]+=*|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|sk_live_[A-Za-z0-9]+|rzp_live_[A-Za-z0-9]+)/gi;

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

export function redactSecrets(text: string): string {
  return text.replace(SECRET_VALUE_PATTERN, "[REDACTED]");
}

export function sanitizeString(
  value: unknown,
  max: number = LIMITS.message,
): string {
  if (value == null) return "";
  const raw = typeof value === "string" ? value : String(value);
  return truncate(redactSecrets(raw), max);
}

export function sanitizeOptionalString(
  value: unknown,
  max: number,
): string | null {
  if (value == null) return null;
  const s = sanitizeString(value, max);
  return s.length ? s : null;
}

export function sanitizeStack(stack: unknown): string | null {
  if (stack == null) return null;
  const s = sanitizeString(stack, LIMITS.stack);
  return s.length ? s : null;
}

export function sanitizeMetadata(
  input: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, unknown> = {};
  let keys = 0;
  for (const [key, value] of Object.entries(input)) {
    if (keys >= LIMITS.metadataKeys) break;
    if (SECRET_KEY_PATTERN.test(key)) {
      out[key] = "[REDACTED]";
      keys += 1;
      continue;
    }
    out[key] = sanitizeMetadataValue(value, 0);
    keys += 1;
  }
  const json = JSON.stringify(out);
  if (json.length > LIMITS.metadataJsonChars) {
    return { truncated: true, note: "Metadata exceeded size limit." };
  }
  return out;
}

function sanitizeMetadataValue(value: unknown, depth: number): unknown {
  if (depth > 4) return "[truncated]";
  if (value == null) return null;
  if (typeof value === "string") return sanitizeString(value, 500);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeMetadataValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    let i = 0;
    for (const [k, v] of Object.entries(obj)) {
      if (i >= 20) break;
      out[SECRET_KEY_PATTERN.test(k) ? k : k] = SECRET_KEY_PATTERN.test(k)
        ? "[REDACTED]"
        : sanitizeMetadataValue(v, depth + 1);
      i += 1;
    }
    return out;
  }
  return sanitizeString(String(value), 200);
}

export function extractErrorMessage(error: unknown): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || error.name || "Error";
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export function extractErrorStack(error: unknown): string | null {
  if (error instanceof Error && error.stack) return error.stack;
  if (
    typeof error === "object" &&
    error !== null &&
    "stack" in error &&
    typeof (error as { stack: unknown }).stack === "string"
  ) {
    return (error as { stack: string }).stack;
  }
  return null;
}

export function parseStackLocation(stack: string | null | undefined): {
  fileName: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  functionName: string | null;
} {
  if (!stack) {
    return {
      fileName: null,
      lineNumber: null,
      columnNumber: null,
      functionName: null,
    };
  }
  const lines = stack.split("\n").map((l) => l.trim());
  for (const line of lines.slice(1, 8)) {
    const m =
      line.match(/at\s+(.*?)\s+\((.*):(\d+):(\d+)\)/) ||
      line.match(/at\s+(.*):(\d+):(\d+)/) ||
      line.match(/(.*):(\d+):(\d+)/);
    if (!m) continue;
    if (m.length === 5) {
      return {
        functionName: sanitizeOptionalString(m[1], 200),
        fileName: sanitizeOptionalString(m[2], LIMITS.fileName),
        lineNumber: Number(m[3]) || null,
        columnNumber: Number(m[4]) || null,
      };
    }
    return {
      functionName: null,
      fileName: sanitizeOptionalString(m[1], LIMITS.fileName),
      lineNumber: Number(m[2]) || null,
      columnNumber: Number(m[3]) || null,
    };
  }
  return {
    fileName: null,
    lineNumber: null,
    columnNumber: null,
    functionName: null,
  };
}
