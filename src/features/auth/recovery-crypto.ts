import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export {
  normalizePhoneForCompare,
  toNationalMobileDigits,
} from "@/features/auth/phone-normalize";

/** Normalize answer before hashing / compare (trim + collapse space + lower). */
export function normalizeRecoveryAnswer(answer: string): string {
  return answer.trim().replace(/\s+/g, " ").toLowerCase();
}

/** scrypt hash format: scrypt$<saltB64>$<hashB64> */
export function hashRecoveryAnswer(answer: string): string {
  const normalized = normalizeRecoveryAnswer(answer);
  const salt = randomBytes(16);
  const hash = scryptSync(normalized, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyRecoveryAnswer(
  answer: string,
  storedHash: string | null | undefined,
): boolean {
  if (!storedHash || !storedHash.startsWith("scrypt$")) return false;
  const parts = storedHash.split("$");
  if (parts.length !== 3) return false;
  const salt = Buffer.from(parts[1]!, "base64url");
  const expected = Buffer.from(parts[2]!, "base64url");
  const actual = scryptSync(normalizeRecoveryAnswer(answer), salt, expected.length, {
    N: 16384,
    r: 8,
    p: 1,
  });
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
