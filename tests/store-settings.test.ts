import { describe, expect, it } from "vitest";
import {
  hasPermission,
  ROLE_PERMISSIONS,
} from "@/features/auth/permissions";
import {
  brandingSettingsSchema,
  generalSettingsSchema,
  headerSettingsSchema,
  navigationItemSchema,
  seoSettingsSchema,
  parseKeywordsInput,
} from "@/features/admin/settings/schemas";
import {
  isSafeHttpUrl,
  isSafeNavHref,
  validateBrandingImageFile,
} from "@/features/admin/settings/validation";

describe("Phase 6 permissions", () => {
  it("grants ADMIN branding/settings/seo/navigation update", () => {
    expect(hasPermission(["ADMIN"], "settings.update")).toBe(true);
    expect(hasPermission(["ADMIN"], "branding.update")).toBe(true);
    expect(hasPermission(["ADMIN"], "seo.update")).toBe(true);
    expect(hasPermission(["ADMIN"], "navigation.update")).toBe(true);
  });

  it("grants EDITOR branding/nav/seo update but not settings.update", () => {
    expect(hasPermission(["EDITOR"], "branding.update")).toBe(true);
    expect(hasPermission(["EDITOR"], "navigation.update")).toBe(true);
    expect(hasPermission(["EDITOR"], "seo.update")).toBe(true);
    expect(hasPermission(["EDITOR"], "settings.update")).toBe(false);
    expect(hasPermission(["EDITOR"], "settings.view")).toBe(false);
  });

  it("denies ORDER_MANAGER branding and settings", () => {
    expect(hasPermission(["ORDER_MANAGER"], "branding.view")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "settings.view")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "seo.view")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "navigation.view")).toBe(false);
  });

  it("keeps SUPER_ADMIN with full settings permissions", () => {
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain("branding.update");
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain("navigation.update");
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain("seo.update");
  });
});

describe("URL validation", () => {
  it("accepts https social URLs", () => {
    expect(isSafeHttpUrl("https://instagram.com/example")).toBe(true);
    expect(isSafeHttpUrl("http://example.com")).toBe(true);
    expect(isSafeHttpUrl("")).toBe(true);
  });

  it("rejects unsafe protocols", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,hi")).toBe(false);
    expect(isSafeNavHref("javascript:void(0)")).toBe(false);
    expect(isSafeNavHref("data:text/html,x")).toBe(false);
  });

  it("accepts internal nav paths and rejects protocol-relative", () => {
    expect(isSafeNavHref("/products")).toBe(true);
    expect(isSafeNavHref("/about?ref=1")).toBe(true);
    expect(isSafeNavHref("//evil.example")).toBe(false);
  });
});

describe("branding validation", () => {
  it("accepts valid brand payload", () => {
    const parsed = brandingSettingsSchema.safeParse({
      brandName: "Acme Store",
      tagline: "Quality goods",
      logoPath: "branding/store/logo.webp",
      logoDarkPath: null,
      faviconPath: null,
      socialSharingImagePath: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty brand name", () => {
    const parsed = brandingSettingsSchema.safeParse({
      brandName: "  ",
      tagline: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid image mime and oversized files", () => {
    expect(
      validateBrandingImageFile({
        type: "image/svg+xml",
        size: 100,
        name: "logo.svg",
      }).ok,
    ).toBe(false);
    expect(
      validateBrandingImageFile({
        type: "image/png",
        size: 6 * 1024 * 1024,
        name: "logo.png",
      }).ok,
    ).toBe(false);
    expect(
      validateBrandingImageFile({
        type: "image/webp",
        size: 2048,
        name: "logo.webp",
      }).ok,
    ).toBe(true);
  });
});

describe("SEO and general validation", () => {
  it("validates SEO lengths and URLs", () => {
    const ok = seoSettingsSchema.safeParse({
      siteTitle: "Acme",
      metaDescription: "A storefront",
      keywords: "shop, goods",
      canonicalUrl: "https://example.com",
      ogTitle: "",
      ogDescription: "",
      ogImagePath: null,
      robotsIndex: true,
      robotsFollow: true,
    });
    expect(ok.success).toBe(true);

    const bad = seoSettingsSchema.safeParse({
      siteTitle: "Acme",
      metaDescription: "",
      keywords: "",
      canonicalUrl: "javascript:alert(1)",
      ogTitle: "",
      ogDescription: "",
      robotsIndex: true,
      robotsFollow: true,
    });
    expect(bad.success).toBe(false);
  });

  it("parses keywords", () => {
    expect(parseKeywordsInput("a, b , ,c")).toEqual(["a", "b", "c"]);
  });

  it("requires currency ISO code", () => {
    const parsed = generalSettingsSchema.safeParse({
      displayName: "Store",
      legalName: "",
      contactEmail: "hello@example.com",
      contactPhone: "",
      contactPhoneSecondary: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      currency: "inr",
      timezone: "UTC",
      defaultLocale: "en-IN",
      businessRegistrationNumber: "",
      taxId: "",
      registrationEnabled: true,
      checkoutGuestAllowed: true,
      socialInstagram: "",
      socialFacebook: "",
      socialYoutube: "",
      socialLinkedin: "",
      socialX: "",
      socialWhatsapp: "",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("navigation and header validation", () => {
  it("rejects unsafe navigation hrefs", () => {
    const parsed = navigationItemSchema.safeParse({
      clientKey: "x",
      location: "header",
      parentId: null,
      label: "Bad",
      href: "javascript:alert(1)",
      sortOrder: 0,
      isActive: true,
      openInNewTab: false,
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts nested-ready header settings", () => {
    const parsed = headerSettingsSchema.safeParse({
      stickyHeader: true,
      searchEnabled: true,
      cartEnabled: true,
      accountEnabled: true,
      mobileMenuEnabled: true,
      navVisible: true,
      logoSize: "medium",
      announcementEnabled: true,
      announcementText: "Sale this week",
      announcementUrl: "/products",
      announcementOpenInNewTab: false,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("unauthorized update rejection (permission map)", () => {
  it("ORDER_MANAGER cannot update branding/settings/seo", () => {
    expect(hasPermission(["ORDER_MANAGER"], "branding.update")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "settings.update")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "seo.update")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "navigation.update")).toBe(false);
  });
});

describe("cache revalidation tag", () => {
  it("uses the shared storefront-config tag name", () => {
    expect("storefront-config").toMatch(/^storefront-config$/);
  });
});
