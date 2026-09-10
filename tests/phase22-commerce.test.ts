import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("phase 22 commerce experience", () => {
  it("ships local logo branding without third-party APIs", () => {
    const extract = readSrc("src/features/theme/logo-branding/extract-colors.ts");
    const generate = readSrc("src/features/theme/logo-branding/generate-palette.ts");
    const suggest = readSrc(
      "src/features/admin/theme/components/LogoThemeSuggest.tsx",
    );
    expect(extract).toContain("isNearWhite");
    expect(extract).toContain("isNearBlack");
    expect(extract).toContain("extractRepresentativeColorsFromImageData");
    expect(generate).toContain("generateBrandThemeFromColors");
    expect(generate).toContain("buildDark");
    expect(suggest).toContain("Apply suggested theme");
    expect(suggest).toContain("Regenerate theme");
    expect(extract.toLowerCase()).not.toContain("openai");
    expect(extract.toLowerCase()).not.toContain("colorthief");
  });

  it("wires logo theme into branding and appearance studio", () => {
    const branding = readSrc(
      "src/features/admin/settings/components/BrandingSettingsForm.tsx",
    );
    const appearance = readSrc(
      "src/features/admin/theme/components/AppearanceStudio.tsx",
    );
    expect(branding).toContain("LogoThemeSuggest");
    expect(branding).toContain("suggestThemeFromLogoFile");
    expect(appearance).toContain("LogoThemeSuggest");
    expect(appearance).toContain("Create from Logo");
  });

  it("restores logo theme suggestion after mount (SSR-safe)", () => {
    const suggest = readSrc(
      "src/features/admin/theme/components/LogoThemeSuggest.tsx",
    );
    expect(suggest).toContain("useEffect");
    expect(suggest).toContain("readLogoThemeSuggestion()");
    expect(suggest).not.toContain(
      'typeof window === "undefined" ? null : readLogoThemeSuggestion()',
    );
  });

  it("upgrades storefront discovery chrome", () => {
    const header = readSrc("src/components/layout/Header.tsx");
    const products = readSrc("src/app/(storefront)/products/page.tsx");
    const home = readSrc("src/app/(storefront)/home-view.tsx");
    expect(header).toContain("Search products");
    expect(header).toContain("searchOpen");
    expect(products).toContain('name="sort"');
    expect(home).toContain("productHeroImages");
    expect(home).toContain("loading=\"eager\"");
    expect(home).toContain("Featured products");
  });
});
