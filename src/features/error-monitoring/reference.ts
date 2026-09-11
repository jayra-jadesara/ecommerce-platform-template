import { createHash, randomBytes } from "node:crypto";

/** Human-friendly unique reference: ERR-XXXXXXXX */
export function generateErrorReferenceId(): string {
  return `ERR-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function isValidErrorReferenceId(value: string): boolean {
  return /^ERR-[0-9A-F]{8}$/i.test(value.trim());
}

/** Stable fingerprint from type + operation + route + normalized message + source loc. */
export function buildErrorFingerprint(input: {
  type: string;
  source: string;
  operation?: string | null;
  route?: string | null;
  message: string;
  fileName?: string | null;
  lineNumber?: number | null;
  functionName?: string | null;
}): string {
  const normalized = normalizeMessageForFingerprint(input.message);
  const parts = [
    input.type,
    input.source,
    (input.operation ?? "").toUpperCase(),
    (input.route ?? "").split("?")[0] ?? "",
    normalized,
    input.fileName ?? "",
    input.lineNumber != null ? String(input.lineNumber) : "",
    input.functionName ?? "",
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

export function normalizeMessageForFingerprint(message: string): string {
  return message
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[uuid]")
    .replace(/\bERR-[0-9A-F]{8}\b/gi, "[ref]")
    .replace(/\b\d{5,}\b/g, "[n]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240)
    .toLowerCase();
}
