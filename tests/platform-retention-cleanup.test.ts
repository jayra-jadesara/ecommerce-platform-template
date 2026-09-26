import { describe, expect, it } from "vitest";
import {
  formatRetentionCutoff,
  isValidRetentionMonths,
  retentionCutoffIso,
  RETENTION_MONTH_OPTIONS,
} from "../src/features/platform-usage/cleanup/retention";

describe("retention purge windows", () => {
  it("exposes rolling month options including 1y / 2y / 6y", () => {
    const months = RETENTION_MONTH_OPTIONS.map((o) => o.months);
    expect(months).toContain(12);
    expect(months).toContain(24);
    expect(months).toContain(72);
    expect(isValidRetentionMonths(12)).toBe(true);
    expect(isValidRetentionMonths(7)).toBe(false);
  });

  it("uses rolling cutoff from today (safe in January)", () => {
    const jan2026 = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));
    const cutoff = retentionCutoffIso(12, jan2026);
    const d = new Date(cutoff);
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(0);
    expect(formatRetentionCutoff(cutoff)).toBeTruthy();
  });
});
