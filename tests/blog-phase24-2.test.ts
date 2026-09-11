import { describe, expect, it } from "vitest";
import {
  blogSettingsFormSchema,
  DEFAULT_BLOG_SETTINGS,
} from "@/features/blog/schemas";
import {
  isListLayout,
  listingLayoutPreset,
  normalizeCardStyle,
  normalizeSidebarPreset,
  wantsFeaturedBlock,
} from "@/features/blog/settings-normalize";
import type { BlogSettings } from "@/features/blog/types";

function settings(
  overrides: Partial<BlogSettings> = {},
): BlogSettings {
  return {
    storeId: "00000000-0000-0000-0000-000000000001",
    ...DEFAULT_BLOG_SETTINGS,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

describe("blog phase 24.2 settings", () => {
  it("accepts expanded settings with CTA and card style", () => {
    const result = blogSettingsFormSchema.safeParse({
      ...DEFAULT_BLOG_SETTINGS,
      showReadingTime: true,
      showShareButtons: true,
      showRelatedPosts: true,
      showRelatedProducts: false,
      showFeaturedPost: true,
      autoFeaturedFallback: true,
      sidebarPreset: "LEFT",
      cardStyle: "EDITORIAL",
      ctaTitle: "Shop the collection",
      ctaDescription: "Find products from this journal.",
      ctaButtonLabel: "Browse",
      ctaButtonHref: "/products",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sidebarPreset).toBe("LEFT");
      expect(result.data.cardStyle).toBe("EDITORIAL");
      expect(result.data.layoutPreset).toBe("FEATURED_GRID");
      expect(result.data.ctaButtonHref).toBe("/products");
    }
  });

  it("rejects unsafe CTA links", () => {
    const result = blogSettingsFormSchema.safeParse({
      ...DEFAULT_BLOG_SETTINGS,
      ctaButtonLabel: "Click",
      ctaButtonHref: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
  });

  it("normalizes legacy sidebar presets", () => {
    expect(normalizeSidebarPreset("SIDEBAR")).toBe("RIGHT");
    expect(normalizeSidebarPreset("TOP_FILTER")).toBe("TOP");
    expect(normalizeSidebarPreset("LEFT")).toBe("LEFT");
    expect(normalizeSidebarPreset("NONE")).toBe("NONE");
  });

  it("normalizes card styles safely", () => {
    expect(normalizeCardStyle("MINIMAL")).toBe("MINIMAL");
    expect(normalizeCardStyle("weird")).toBe("STANDARD");
  });

  it("derives featured and list layout flags", () => {
    expect(wantsFeaturedBlock(settings({ showFeaturedPost: true }))).toBe(true);
    expect(wantsFeaturedBlock(settings({ showFeaturedPost: false }))).toBe(
      false,
    );
    expect(
      wantsFeaturedBlock(
        settings({ layoutPreset: "FEATURED_GRID", showFeaturedPost: true }),
      ),
    ).toBe(true);
    expect(isListLayout(settings({ layoutPreset: "LIST" }))).toBe(true);
    expect(listingLayoutPreset("GRID", true)).toBe("FEATURED_GRID");
    expect(listingLayoutPreset("GRID", false)).toBe("GRID");
    expect(listingLayoutPreset("LIST", true)).toBe("LIST");
  });

  it("maps SIDEBAR legacy value to RIGHT on save", () => {
    const result = blogSettingsFormSchema.safeParse({
      ...DEFAULT_BLOG_SETTINGS,
      sidebarPreset: "SIDEBAR",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sidebarPreset).toBe("RIGHT");
    }
  });

  it("keeps showSearch and related toggles", () => {
    const result = blogSettingsFormSchema.safeParse({
      ...DEFAULT_BLOG_SETTINGS,
      showSearch: false,
      showRelatedPosts: false,
      showShareButtons: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.showSearch).toBe(false);
      expect(result.data.showRelatedPosts).toBe(false);
      expect(result.data.showShareButtons).toBe(false);
    }
  });
});
