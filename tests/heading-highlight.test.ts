import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HEADING_HIGHLIGHT_STYLES,
  coerceHeadingHighlightStyle,
  resolveHeadingAccent,
} from "@/features/theme/heading-highlight";
import {
  SAFE_FONT_OPTIONS,
  themeConfigToFormValues,
  formValuesToThemeConfig,
  fontIdToCss,
} from "@/features/admin/theme/editor-schema";
import { formValuesToThemeDbRow } from "@/features/admin/theme/map-to-db";
import { defaultPlatformConfig } from "@/config/defaults";
import { sectionCommonSettingsSchema } from "@/features/cms/schemas";
import { FONT_FACE_VARS } from "@/features/theme/typography-css";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("heading highlight presets", () => {
  it("allow-lists creative + premium designs and defaults to double", () => {
    expect(HEADING_HIGHLIGHT_STYLES).toContain("double");
    expect(HEADING_HIGHLIGHT_STYLES).toContain("circle");
    expect(HEADING_HIGHLIGHT_STYLES).toContain("brush");
    expect(HEADING_HIGHLIGHT_STYLES).toContain("ribbon");
    expect(HEADING_HIGHLIGHT_STYLES).toContain("capsule");
    expect(HEADING_HIGHLIGHT_STYLES).toContain("editorial");
    expect(HEADING_HIGHLIGHT_STYLES).toContain("gradient");
    expect(HEADING_HIGHLIGHT_STYLES).toContain("spark");
    expect(HEADING_HIGHLIGHT_STYLES).toContain("none");
    expect(coerceHeadingHighlightStyle("box")).toBe("box");
    expect(coerceHeadingHighlightStyle("gradient")).toBe("gradient");
    expect(coerceHeadingHighlightStyle("nope")).toBe("double");
    expect(defaultPlatformConfig.typography.headingHighlightStyle).toBe(
      "double",
    );
  });

  it("resolves accent word and falls back to last word", () => {
    expect(resolveHeadingAccent("Our product range", "range")).toEqual({
      before: "Our product ",
      accent: "range",
      after: "",
    });
    expect(resolveHeadingAccent("Featured products", "")).toEqual({
      before: "Featured ",
      accent: "products",
      after: "",
    });
  });
});

describe("premium font catalog", () => {
  it("exposes curated customer-facing typefaces", () => {
    const ids = SAFE_FONT_OPTIONS.map((f) => f.id);
    expect(ids).toContain("playfair");
    expect(ids).toContain("cormorant");
    expect(ids).toContain("outfit");
    expect(ids).toContain("plus_jakarta");
    expect(ids).toContain("manrope");
    expect(ids).toContain("lora");
    expect(ids).toContain("space_grotesk");
    expect(ids).toContain("syne");
    expect(fontIdToCss("playfair")).toBe(FONT_FACE_VARS.playfair);
    expect(SAFE_FONT_OPTIONS.every((f) => f.mood && f.blurb)).toBe(true);
  });

  it("layout loads premium next/font face variables", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain("Playfair_Display");
    expect(layout).toContain("Plus_Jakarta_Sans");
    expect(layout).toContain("--font-playfair");
    expect(layout).toContain("--font-syne");
    expect(layout).toContain("storefrontFontVariables");
  });
});

describe("theme persistence contracts", () => {
  it("round-trips headingHighlightStyle through form and DB map", () => {
    const form = themeConfigToFormValues(
      defaultPlatformConfig.theme,
      defaultPlatformConfig.animation,
      {
        fontSans: defaultPlatformConfig.typography.fontSans,
        fontDisplay: defaultPlatformConfig.typography.fontDisplay,
        headingHighlightStyle: "gradient",
      },
      defaultPlatformConfig.visualEffects,
    );
    expect(form.headingHighlightStyle).toBe("gradient");
    const row = formValuesToThemeDbRow(form);
    expect(row.heading_highlight_style).toBe("gradient");
    expect(formValuesToThemeConfig(form).borderRadius).toBeTruthy();
  });

  it("migrations cover style column and premium presets", () => {
    const v1 = read(
      "supabase/migrations/20260912010000_heading_highlight_style.sql",
    );
    const v3 = read(
      "supabase/migrations/20260912030000_heading_highlight_presets_premium.sql",
    );
    expect(v1).toContain("heading_highlight_style");
    expect(v3).toContain("'circle'");
    expect(v3).toContain("'gradient'");
    expect(v3).toContain("'spark'");
  });
});

describe("CMS + storefront wiring", () => {
  it("section common settings keep headingHighlight for backward-compatible JSON", () => {
    const parsed = sectionCommonSettingsSchema.parse({});
    expect(parsed.headingHighlight).toBe("");
  });

  it("SectionAccentHeading supports premium highlightStyle variants", () => {
    const src = read("src/components/ui/SectionAccentHeading.tsx");
    expect(src).toContain('style === "circle"');
    expect(src).toContain('style === "brush"');
    expect(src).toContain("sf-heading-highlight--gradient");
    expect(src).toContain("sf-heading-highlight--spark");
  });

  it("storefront CSS defines highlighter designs", () => {
    const css = read("src/styles/storefront.css");
    expect(css).toContain(".sf-heading-highlight--ribbon");
    expect(css).toContain(".sf-heading-highlight--capsule");
    expect(css).toContain(".sf-heading-highlight--editorial");
    expect(css).toContain(".sf-heading-highlight--gradient");
    expect(css).toContain(".sf-heading-highlight--spark");
  });

  it("Typography studio UI exposes fonts and highlighters", () => {
    const panel = read(
      "src/features/admin/theme/components/TypographyStudioPanel.tsx",
    );
    const appearance = read(
      "src/features/admin/theme/components/AppearanceStudio.tsx",
    );
    expect(appearance).toContain("TypographyStudioPanel");
    expect(panel).toContain("Heading highlighter");
    expect(panel).toContain("Premium");
    expect(panel).toContain("SAFE_FONT_OPTIONS");
    expect(panel).toContain("Our product range");
    expect(panel).not.toContain("Pick which word in Content");
  });

  it("SectionRenderer passes store style only (last-word accent)", () => {
    const src = read("src/features/cms/components/SectionRenderer.tsx");
    expect(src).toContain("headingHighlightStyle");
    expect(src).not.toContain("c.headingHighlight");
    expect(src).not.toContain("accentWord");
  });

  it("PageShell and key pages use StorefrontHeading", () => {
    expect(read("src/components/layout/PageShell.tsx")).toContain(
      "StorefrontHeading",
    );
    expect(read("src/components/ui/StorefrontHeading.tsx")).toContain(
      "usePlatformConfig",
    );
  });
});
