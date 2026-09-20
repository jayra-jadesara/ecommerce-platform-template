import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  normalizePhoneForCompare,
  toNationalMobileDigits,
} from "@/features/auth/phone-normalize";
import {
  hashRecoveryAnswer,
  verifyRecoveryAnswer,
} from "@/features/auth/recovery-crypto";

describe("password recovery helpers", () => {
  it("hashes and verifies recovery answers case-insensitively", () => {
    const hash = hashRecoveryAnswer("  Blue  Dog ");
    expect(verifyRecoveryAnswer("blue dog", hash)).toBe(true);
    expect(verifyRecoveryAnswer("wrong", hash)).toBe(false);
  });

  it("normalizes Indian phone numbers", () => {
    expect(normalizePhoneForCompare("9876543210")).toBe("+919876543210");
    expect(normalizePhoneForCompare("+91 98765 43210")).toBe("+919876543210");
    expect(normalizePhoneForCompare("919876543210")).toBe("+919876543210");
  });

  it("strips country code for national mobile display", () => {
    expect(toNationalMobileDigits("+918899445566")).toBe("8899445566");
    expect(toNationalMobileDigits("918899445566")).toBe("8899445566");
    expect(toNationalMobileDigits("8899445566")).toBe("8899445566");
  });
});
