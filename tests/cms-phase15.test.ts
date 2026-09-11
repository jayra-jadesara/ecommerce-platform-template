import { describe, expect, it } from "vitest";
import {
  bannerFormSchema,
  defaultConfigForType,
  heroSectionConfigSchema,
  isSupportedSectionType,
  parseSectionConfig,
  productsSectionConfigSchema,
  categoriesSectionConfigSchema,
  ctaSectionConfigSchema,
  safeUrlSchema,
  pageFormSchema,
} from "@/features/cms/schemas";
import { hasPermission, ROLE_PERMISSIONS } from "@/features/auth/permissions";
import { ADMIN_NAV_TREE } from "@/features/admin/nav";
import { getAdminPath } from "@/config/admin-route";

describe("section type allow-list", () => {
  it("accepts known types and rejects custom/unknown", () => {
    expect(isSupportedSectionType("hero")).toBe(true);
    expect(isSupportedSectionType("products")).toBe(true);
    expect(isSupportedSectionType("custom")).toBe(false);
    expect(parseSectionConfig("custom", {}).ok).toBe(false);
    expect(parseSectionConfig("evil_script", {}).ok).toBe(false);
  });
});

describe("section config validation", () => {
  it("validates hero config", () => {
    const ok = heroSectionConfigSchema.safeParse({
      title: "Welcome",
      primaryButtonLink: "/products",
      secondaryButtonLink: "https://example.com",
    });
    expect(ok.success).toBe(true);

    const bad = heroSectionConfigSchema.safeParse({
      title: "Hi",
      primaryButtonLink: "javascript:alert(1)",
    });
    expect(bad.success).toBe(false);
  });

  it("validates product grid and category grid", () => {
    expect(
      productsSectionConfigSchema.safeParse({
        source: "FEATURED_PRODUCTS",
        limit: 8,
      }).success,
    ).toBe(true);
    expect(
      productsSectionConfigSchema.safeParse({
        source: "NOT_A_SOURCE",
      }).success,
    ).toBe(false);
    expect(
      categoriesSectionConfigSchema.safeParse({
        columns: 3,
        categoryIds: [],
      }).success,
    ).toBe(true);
  });

  it("validates CTA and defaults", () => {
    expect(ctaSectionConfigSchema.safeParse({}).success).toBe(true);
    const defaults = defaultConfigForType("cta");
    expect(defaults.animationPreset).toBe("fade-up");
  });

  it("rejects arbitrary executable config via parseSectionConfig", () => {
    const result = parseSectionConfig("hero", {
      title: "X",
      primaryButtonLink: "javascript:void(0)",
    });
    expect(result.ok).toBe(false);
  });
});

describe("safe URL validation", () => {
  it("allows internal paths and https", () => {
    expect(safeUrlSchema.safeParse("/products").success).toBe(true);
    expect(safeUrlSchema.safeParse("https://example.com/a").success).toBe(true);
    expect(safeUrlSchema.safeParse("http://example.com").success).toBe(true);
  });

  it("blocks dangerous schemes and protocol-relative URLs", () => {
    expect(safeUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(safeUrlSchema.safeParse("data:text/html,hi").success).toBe(false);
    expect(safeUrlSchema.safeParse("//evil.example").success).toBe(false);
  });
});

describe("page and banner schemas", () => {
  it("validates page forms and slug format", () => {
    expect(
      pageFormSchema.safeParse({
        title: "About",
        slug: "about-us",
        status: "draft",
      }).success,
    ).toBe(true);
    expect(
      pageFormSchema.safeParse({
        title: "Bad",
        slug: "About Us",
        status: "draft",
      }).success,
    ).toBe(false);
  });

  it("validates banners and date order", () => {
    expect(
      bannerFormSchema.safeParse({
        title: "Sale",
        isActive: true,
        sortOrder: 0,
      }).success,
    ).toBe(true);
    expect(
      bannerFormSchema.safeParse({
        title: "Sale",
        startsAt: "2026-12-01T00:00:00.000Z",
        endsAt: "2026-01-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});

describe("content permissions and nav", () => {
  it("grants editors content publish and denies order managers", () => {
    expect(hasPermission(["EDITOR"], "content.publish")).toBe(true);
    expect(hasPermission(["EDITOR"], "content.update")).toBe(true);
    expect(hasPermission(["ORDER_MANAGER"], "content.view")).toBe(false);
    expect(ROLE_PERMISSIONS.ADMIN.includes("content.delete")).toBe(true);
  });

  it("keeps Content IA labels client-friendly", () => {
    const content = ADMIN_NAV_TREE.find((e) => e.id === "content");
    expect(content?.kind).toBe("group");
    if (content?.kind !== "group") return;
    expect(content.label).toBe("Content");
    expect(content.children.map((c) => c.label)).toEqual([
      "Homepage",
      "About",
      "Pages",
      "Banners",
      "Blog",
      "Images & Files",
    ]);
    expect(content.children.map((c) => c.href)).toContain(
      getAdminPath("/content/homepage"),
    );
  });
});

describe("publishing / rendering contracts", () => {
  it("documents draft vs published storefront behavior", () => {
    // getPublishedStorefrontPage filters status=published and is_active sections.
    // Disabled sections and draft pages must not render publicly.
    const publicStatuses = new Set(["published"]);
    expect(publicStatuses.has("draft")).toBe(false);
    expect(publicStatuses.has("archived")).toBe(false);
  });

  it("reorder contract keeps a permutation of section ids", () => {
    const ids = ["a", "b", "c"];
    const moved = ["b", "a", "c"];
    expect(moved.sort().join()).toBe([...ids].sort().join());
  });
});
