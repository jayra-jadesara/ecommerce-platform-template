import { describe, expect, it } from "vitest";
import {
  CLEAR_ACTIVITY_TABLE_ORDER,
  CLEAR_ORDERS_TABLE_ORDER,
  CONFIRM_PHRASES,
  FORMAT_RESET_STORAGE_BUCKETS,
  FORMAT_RESET_TABLE_ORDER,
  KEEP_TABLES,
  assertWipeSafe,
  isConfirmPhraseValid,
} from "../src/features/platform-usage/cleanup/keep-wipe";
import { STORAGE_BUCKETS } from "../src/lib/supabase/storage";

describe("platform cleanup keep/wipe", () => {
  it("never includes keep tables in wipe orders", () => {
    const keep = new Set<string>(KEEP_TABLES);
    for (const table of [
      ...FORMAT_RESET_TABLE_ORDER,
      ...CLEAR_ORDERS_TABLE_ORDER,
      ...CLEAR_ACTIVITY_TABLE_ORDER,
    ]) {
      expect(keep.has(table), `${table} must not be wiped`).toBe(false);
    }
    expect(() => assertWipeSafe(FORMAT_RESET_TABLE_ORDER)).not.toThrow();
    expect(() => assertWipeSafe(["stores" as never])).toThrow(/keep-table/);
  });

  it("does not wipe branding storage on format reset", () => {
    expect(FORMAT_RESET_STORAGE_BUCKETS).not.toContain(STORAGE_BUCKETS.branding);
    expect(FORMAT_RESET_STORAGE_BUCKETS).toContain(STORAGE_BUCKETS.products);
    expect(FORMAT_RESET_STORAGE_BUCKETS).toContain(STORAGE_BUCKETS.replacements);
  });

  it("validates confirm phrases", () => {
    expect(isConfirmPhraseValid("format_reset", "RESET")).toBe(true);
    expect(isConfirmPhraseValid("format_reset", "reset")).toBe(true);
    expect(isConfirmPhraseValid("format_reset", "CLEAR")).toBe(false);
    expect(isConfirmPhraseValid("clear_orders_payments", "CLEAR")).toBe(true);
    expect(CONFIRM_PHRASES.format_reset).toBe("RESET");
  });

  it("orders payments before orders for RESTRICT FKs", () => {
    const list = [...FORMAT_RESET_TABLE_ORDER];
    expect(list.indexOf("payments")).toBeLessThan(list.indexOf("orders"));
    expect(list.indexOf("order_items")).toBeLessThan(list.indexOf("orders"));
    expect(list.indexOf("product_images")).toBeLessThan(list.indexOf("products"));
  });
});
