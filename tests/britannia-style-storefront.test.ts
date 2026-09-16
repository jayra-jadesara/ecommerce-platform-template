import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { heroSectionConfigSchema } from "@/features/cms/schemas";
import { footerSettingsSchema } from "@/features/admin/settings/schemas";
import { LOGO_SIZE_OPTIONS } from "@/features/admin/settings/validation";
import { generateBrandThemeFromColors } from "@/features/theme/logo-branding/generate-palette";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("britannia-style hero slides", () => {
  it("accepts slides with safe hrefs and caps at 8", () => {
    const ok = heroSectionConfigSchema.safeParse({
      title: "Welcome",
      slides: [
        {
          imagePath: "cms/hero-1.jpg",
          title: "Slide one",
          badge: "NEW",
          ctaLabel: "Shop",
          ctaHref: "/products",
        },
      ],
      autoplayMs: 5000,
      showArrows: true,
    });
    expect(ok.success).toBe(true);

    const tooMany = heroSectionConfigSchema.safeParse({
      title: "Welcome",
      slides: Array.from({ length: 9 }, (_, i) => ({
        imagePath: `cms/h-${i}.jpg`,
      })),
    });
    expect(tooMany.success).toBe(false);
  });

  it("rejects unsafe slide CTA links", () => {
    const bad = heroSectionConfigSchema.safeParse({
      title: "Welcome",
      slides: [
        {
          imagePath: "cms/hero.jpg",
          ctaHref: "javascript:alert(1)",
        },
      ],
    });
    expect(bad.success).toBe(false);
  });

  it("ships HeroCarousel and admin slide editor markers", () => {
    expect(
      read("src/features/cms/components/HeroCarousel.tsx"),
    ).toContain("autoplayMs");
    expect(
      read("src/features/cms/components/HomepageBuilder.tsx"),
    ).toContain("Slideshow images");
    expect(
      read("src/features/cms/components/SectionRenderer.tsx"),
    ).toContain("HeroCarousel");
  });
});

describe("britannia-style chrome", () => {
  it("includes xlarge logo size", () => {
    expect(LOGO_SIZE_OPTIONS).toContain("xlarge");
    expect(read("src/components/layout/Header.tsx")).toContain("xlarge");
  });

  it("exports ShareActions for PDP", () => {
    const share = read("src/components/ui/ShareActions.tsx");
    expect(share).toContain("Instagram");
    expect(share).toContain("YouTube");
    expect(share).toContain("sf-share-chip");
    expect(
      read("src/features/catalog/components/ProductDetailClient.tsx"),
    ).toContain("ShareActions");
    expect(
      read("src/features/blog/components/BlogShareButtons.tsx"),
    ).toContain("profiles");
  });

  it("restyles Back to top control", () => {
    const source = read("src/components/layout/ScrollToTop.tsx");
    expect(source).toContain("Back to");
    expect(source).toContain("Top");
    expect(source).toContain("sf-back-to-top");
  });

  it("accepts optional footer featured product id", () => {
    const ok = footerSettingsSchema.safeParse({
      enabled: true,
      description: "",
      showContact: true,
      showSocial: true,
      showNewsletter: false,
      navVisible: true,
      copyrightText: "",
      showFeaturedProduct: true,
      featuredProductId: "00000000-0000-4000-8000-000000000001",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.featuredProductId).toBe(
        "00000000-0000-4000-8000-000000000001",
      );
    }
  });

  it("footer uses Britannia-style connect chips and curve", () => {
    const footer = read("src/components/layout/Footer.tsx");
    expect(footer).toContain("Connect with us");
    expect(footer).toContain("sf-footer-social-chip");
    expect(footer).toContain("sf-footer-curve");
  });
});

describe("logo-derived black dark theme", () => {
  it("builds near-black dark backgrounds from logo colors", () => {
    const theme = generateBrandThemeFromColors(["#9f1239", "#d97706"]);
    expect(theme).not.toBeNull();
    expect(theme!.dark.background.toLowerCase()).toBe("#0a0a0a");
  });
});
