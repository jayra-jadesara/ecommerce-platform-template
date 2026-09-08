import { describe, expect, it } from "vitest";
import { THEME_COLOR_PACKS, findMatchingThemePackId } from "@/features/admin/theme/color-packs";

describe("theme color packs", () => {
  it("offers ready-made looks for merchants", () => {
    expect(THEME_COLOR_PACKS.length).toBeGreaterThanOrEqual(4);
    expect(THEME_COLOR_PACKS.every((pack) => pack.light.primary)).toBe(true);
    expect(THEME_COLOR_PACKS.every((pack) => pack.dark.primary)).toBe(true);
  });

  it("matches the forest pack by primary colors", () => {
    const forest = THEME_COLOR_PACKS.find((pack) => pack.id === "forest");
    expect(forest).toBeTruthy();
    expect(findMatchingThemePackId(forest!.light, forest!.dark)).toBe("forest");
  });
});
