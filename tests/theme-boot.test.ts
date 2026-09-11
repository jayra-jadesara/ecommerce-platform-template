import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("injects boot via ThemeBootScript + useServerInsertedHTML", () => {
    const boot = readFileSync(
      join(process.cwd(), "src/features/theme/ThemeBootScript.tsx"),
      "utf8",
    );
    const providers = readFileSync(
      join(process.cwd(), "src/providers/AppProviders.tsx"),
      "utf8",
    );
    const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(boot).toContain("useServerInsertedHTML");
    expect(boot).toContain('id="platform-theme-boot"');
    expect(boot).toContain("dangerouslySetInnerHTML");
    expect(providers).toContain("ThemeBootScript");
    expect(providers).toContain("buildThemeBootScript");
    expect(layout).toContain("AppProviders");
    expect(layout).toContain("ThemeBootScript");
    expect(layout).not.toContain('from "next/script"');
    // Boot markup is owned by ThemeBootScript, not the root layout tree.
    expect(layout).not.toMatch(/dangerouslySetInnerHTML[\s\S]*platform-theme-boot/);
  });
});
