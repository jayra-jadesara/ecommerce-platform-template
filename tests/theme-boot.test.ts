import { describe, expect, it } from "vitest";
import { defaultPlatformConfig } from "@/config/defaults";
import { buildThemeBootScript } from "@/features/theme/theme-boot-script";

describe("theme boot script", () => {
  it("embeds light and dark token CSS and storage key", () => {
    const script = buildThemeBootScript(defaultPlatformConfig);
    expect(script).toContain("platform-theme-mode");
    expect(script).toContain("--color-background");
    expect(script).toContain("colorScheme");
    expect(script).toContain("localStorage");
  });

  it("is a self-invoking function", () => {
    const script = buildThemeBootScript(defaultPlatformConfig);
    expect(script.startsWith("(()=>{")).toBe(true);
    expect(script.endsWith("})();")).toBe(true);
  });
});
