import { z } from "zod";
import {
  LOGO_HANG_OPTIONS,
  LOGO_SIZE_OPTIONS,
  optionalEmail,
  optionalPhone,
  optionalSafeHttpUrl,
  optionalSafeNavHref,
  optionalWhatsapp,
  requiredSafeNavHref,
} from "@/features/admin/settings/validation";
import {
  DEFAULT_SITEMAP_PATHS,
  buildDefaultSitemapPaths,
  hydrateSitemapFromCatalog,
  normalizeSitemapPath,
  parseSitemapPaths,
} from "@/features/seo/sitemap-paths";
import {
  DEFAULT_STOREFRONT_PATHS,
  cmsSlugFromPath,
  normalizeStorefrontPath,
  parseStorefrontPaths,
} from "@/features/seo/storefront-paths";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  DEFAULT_STORE_COUNTRY,
} from "@/lib/phone";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v.trim());

export const generalSettingsSchema = z.object({
  displayName: z.string().trim().min(1, "Store name is required").max(120),
  legalName: optionalText(160),
  contactEmail: optionalEmail,
  contactPhone: optionalPhone,
  contactPhoneSecondary: optionalPhone,
  addressLine1: optionalText(160),
  addressLine2: optionalText(160),
  city: optionalText(80),
  state: optionalText(80),
  postalCode: optionalText(32),
  country: optionalText(80),
  phoneCountryCode: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, "Select a valid dial code (e.g. +91)"),
  currency: z
    .string()
    .trim()
    .min(3)
    .max(3)
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code (e.g. INR)"),
  timezone: z.string().trim().min(1).max(64),
  defaultLocale: z.string().trim().min(2).max(16),
  businessRegistrationNumber: optionalText(80),
  taxId: optionalText(80),
  registrationEnabled: z.boolean(),
  checkoutGuestAllowed: z.boolean(),
  socialInstagram: optionalSafeHttpUrl,
  socialFacebook: optionalSafeHttpUrl,
  socialYoutube: optionalSafeHttpUrl,
  socialLinkedin: optionalSafeHttpUrl,
  socialX: optionalSafeHttpUrl,
  socialWhatsapp: optionalWhatsapp,
  /** Admin image uploads max size in MB (1–10). */
  adminImageMaxMb: z.coerce.number().int().min(1).max(10),
  /** Admin reel video uploads max size in MB (2–50). */
  adminReelVideoMaxMb: z.coerce.number().int().min(2).max(50),
  /** Contact page hero banner (off by default). */
  contactBannerEnabled: z.boolean(),
  contactBannerImagePath: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      const trimmed = typeof v === "string" ? v.trim() : "";
      return trimmed ? trimmed : null;
    }),
  contactSpotlightEnabled: z.boolean(),
  contactSpotlightImagePath: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      const trimmed = typeof v === "string" ? v.trim() : "";
      return trimmed ? trimmed : null;
    }),
  contactPageHeading: optionalText(80),
  contactPageSupport: optionalText(160),
  contactMapEnabled: z.boolean(),
  contactMapEmbedUrl: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      const trimmed = typeof v === "string" ? v.trim() : "";
      return trimmed ? trimmed : null;
    }),
  /** Storefront LoadingState visual. */
  storefrontLoaderStyle: z.enum([
    "spinner",
    "ring",
    "dots",
    "pulse",
    "bars",
    "dual",
    "orbit",
    "wave",
    "bloom",
    "dash",
  ]),
  storefrontLoaderLabel: z
    .string()
    .trim()
    .min(1, "Enter a loading label.")
    .max(40),
});

export type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;

export const brandingSettingsSchema = z.object({
  brandName: z.string().trim().min(1, "Brand name is required").max(120),
  tagline: optionalText(200),
  logoPath: z.string().trim().max(512).nullable().optional(),
  logoDarkPath: z.string().trim().max(512).nullable().optional(),
  faviconPath: z.string().trim().max(512).nullable().optional(),
  socialSharingImagePath: z.string().trim().max(512).nullable().optional(),
});

export type BrandingSettingsFormValues = z.infer<typeof brandingSettingsSchema>;

export const headerSettingsSchema = z.object({
  stickyHeader: z.boolean(),
  searchEnabled: z.boolean(),
  cartEnabled: z.boolean(),
  accountEnabled: z.boolean(),
  mobileMenuEnabled: z.boolean(),
  navVisible: z.boolean(),
  productsCategoryMenu: z.boolean(),
  logoSize: z.enum(LOGO_SIZE_OPTIONS),
  logoHang: z.enum(LOGO_HANG_OPTIONS),
  announcementEnabled: z.boolean(),
  announcementText: optionalText(240),
  announcementUrl: optionalSafeNavHref,
  announcementOpenInNewTab: z.boolean(),
});

export type HeaderSettingsFormValues = z.infer<typeof headerSettingsSchema>;

export const footerSettingsSchema = z.object({
  enabled: z.boolean(),
  description: optionalText(500),
  showContact: z.boolean(),
  showSocial: z.boolean(),
  showNewsletter: z.boolean(),
  showLogo: z.boolean(),
  navVisible: z.boolean(),
  /** Always cleared on save — copyright is generated with the current year. */
  copyrightText: optionalText(240),
  showFeaturedProduct: z.boolean(),
  featuredProductId: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .transform((v) => (v == null || v === "" ? null : v)),
});

export type FooterSettingsFormValues = z.infer<typeof footerSettingsSchema>;

export const seoPageCopySchema = z.object({
  title: optionalText(120),
  description: optionalText(320),
});

export const seoSettingsSchema = z.object({
  siteTitle: z.string().trim().min(1, "Store name on Google is required").max(120),
  siteName: optionalText(120),
  metaDescription: optionalText(320),
  keywords: optionalText(500),
  canonicalUrl: optionalSafeHttpUrl,
  ogTitle: optionalText(120),
  ogDescription: optionalText(320),
  ogImagePath: z.string().trim().max(512).nullable().optional(),
  robotsIndex: z.boolean(),
  robotsFollow: z.boolean(),
  googleSiteVerification: optionalText(200),
  titleTemplate: optionalText(120),
  twitterHandle: optionalText(80),
  schemaLocalBusiness: z.boolean(),
  schemaOrganization: z.boolean(),
  schemaWebsiteSearch: z.boolean(),
  schemaBusinessType: optionalText(80),
  schemaPriceRange: optionalText(40),
  schemaGeoLat: optionalText(40),
  schemaGeoLng: optionalText(40),
  sitemapProducts: z.boolean(),
  sitemapCategories: z.boolean(),
  sitemapBlog: z.boolean(),
  storefrontPaths: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        path: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .regex(/^\/[A-Za-z0-9\-._/~]*$/, "Path must start with /"),
        label: optionalText(80),
        cmsSlug: optionalText(80),
      }),
    )
    .max(50),
  sitemapPaths: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        path: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .regex(/^\/[A-Za-z0-9\-._/~]*$/, "Path must start with /"),
        label: optionalText(80),
        priority: z.number().min(0).max(1),
        enabled: z.boolean(),
        cmsSlug: optionalText(80),
      }),
    )
    .max(50),
  pageAboutTitle: optionalText(120),
  pageAboutDescription: optionalText(320),
  pageContactTitle: optionalText(120),
  pageContactDescription: optionalText(320),
  pageCareerTitle: optionalText(120),
  pageCareerDescription: optionalText(320),
  pageProductsTitle: optionalText(120),
  pageProductsDescription: optionalText(320),
  pageBlogTitle: optionalText(120),
  pageBlogDescription: optionalText(320),
  pageBrochureTitle: optionalText(120),
  pageBrochureDescription: optionalText(320),
  pagePrivacyTitle: optionalText(120),
  pagePrivacyDescription: optionalText(320),
  pageTermsTitle: optionalText(120),
  pageTermsDescription: optionalText(320),
  pageDisclaimerTitle: optionalText(120),
  pageDisclaimerDescription: optionalText(320),
});

export type SeoSettingsFormValues = z.infer<typeof seoSettingsSchema>;

export function parseKeywordsInput(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 40);
}

/** Build page_seo JSONB payload from flat form fields. */
export function buildPageSeoPayload(values: SeoSettingsFormValues): Record<
  string,
  { title?: string; description?: string }
> {
  const pages: Record<string, { title?: string; description?: string }> = {};
  const pairs: Array<[string, string, string]> = [
    ["about", values.pageAboutTitle, values.pageAboutDescription],
    ["contact", values.pageContactTitle, values.pageContactDescription],
    ["career", values.pageCareerTitle, values.pageCareerDescription],
    ["products", values.pageProductsTitle, values.pageProductsDescription],
    ["blog", values.pageBlogTitle, values.pageBlogDescription],
    ["brochure", values.pageBrochureTitle, values.pageBrochureDescription],
    ["privacy", values.pagePrivacyTitle, values.pagePrivacyDescription],
    ["terms", values.pageTermsTitle, values.pageTermsDescription],
    ["disclaimer", values.pageDisclaimerTitle, values.pageDisclaimerDescription],
  ];
  for (const [key, title, description] of pairs) {
    const t = title?.trim();
    const d = description?.trim();
    if (t || d) {
      pages[key] = {
        ...(t ? { title: t } : {}),
        ...(d ? { description: d } : {}),
      };
    }
  }
  return pages;
}

export function buildSchemaSettingsPayload(
  values: SeoSettingsFormValues,
): Record<string, unknown> {
  const storefrontPaths = values.storefrontPaths.map((row) => {
    const path = normalizeStorefrontPath(row.path);
    return {
      id: row.id,
      path,
      label: row.label?.trim() || path,
      cmsSlug: cmsSlugFromPath(path),
    };
  });
  const sitemapHydrated = hydrateSitemapFromCatalog(
    values.sitemapPaths.map((row) => ({
      id: row.id,
      path: normalizeSitemapPath(row.path),
      label: row.label?.trim() || row.path,
      priority: row.priority,
      enabled: row.enabled,
      cmsSlug: "",
    })),
    storefrontPaths,
  );
  return {
    localBusiness: values.schemaLocalBusiness,
    organization: values.schemaOrganization,
    websiteSearch: values.schemaWebsiteSearch,
    businessType: values.schemaBusinessType?.trim() || undefined,
    priceRange: values.schemaPriceRange?.trim() || undefined,
    geoLat: values.schemaGeoLat?.trim() || undefined,
    geoLng: values.schemaGeoLng?.trim() || undefined,
    sitemapProducts: values.sitemapProducts,
    sitemapCategories: values.sitemapCategories,
    sitemapBlog: values.sitemapBlog,
    storefrontPaths,
    sitemapPaths: sitemapHydrated,
  };
}

export function flattenSchemaSettings(raw: unknown): Pick<
  SeoSettingsFormValues,
  | "schemaLocalBusiness"
  | "schemaOrganization"
  | "schemaWebsiteSearch"
  | "schemaBusinessType"
  | "schemaPriceRange"
  | "schemaGeoLat"
  | "schemaGeoLng"
  | "sitemapProducts"
  | "sitemapCategories"
  | "sitemapBlog"
  | "storefrontPaths"
  | "sitemapPaths"
> {
  const o =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const bool = (key: string, fallback: boolean) =>
    typeof o[key] === "boolean" ? (o[key] as boolean) : fallback;
  const str = (key: string) =>
    typeof o[key] === "string" ? String(o[key]).trim() : "";

  let storefrontPaths = parseStorefrontPaths(o.storefrontPaths);
  if (!storefrontPaths.length) {
    // Migrate: derive catalog from existing sitemapPaths, else form seed
    const fromSitemap = parseSitemapPaths(o.sitemapPaths);
    if (fromSitemap.length) {
      storefrontPaths = fromSitemap.map((p) => ({
        id: p.id.replace(/^sm-/, "") || p.id,
        path: p.path,
        label: p.label,
        cmsSlug: p.cmsSlug,
      }));
    } else {
      storefrontPaths = DEFAULT_STOREFRONT_PATHS.map((p) => ({ ...p }));
    }
  }

  let sitemapPaths = parseSitemapPaths(o.sitemapPaths);
  if (!sitemapPaths.length) {
    sitemapPaths = buildDefaultSitemapPaths(storefrontPaths);
    if (typeof o.sitemapCareer === "boolean" || typeof o.sitemapLegal === "boolean") {
      const careerOn = bool("sitemapCareer", true);
      const legalOn = bool("sitemapLegal", true);
      sitemapPaths = sitemapPaths.map((p) => {
        if (p.path === "/career") return { ...p, enabled: careerOn };
        if (
          p.path === "/privacy" ||
          p.path === "/terms" ||
          p.path === "/disclaimer"
        ) {
          return { ...p, enabled: legalOn };
        }
        return p;
      });
    }
  }
  sitemapPaths = hydrateSitemapFromCatalog(sitemapPaths, storefrontPaths);

  return {
    schemaLocalBusiness: bool("localBusiness", true),
    schemaOrganization: bool("organization", true),
    schemaWebsiteSearch: bool("websiteSearch", true),
    schemaBusinessType: str("businessType"),
    schemaPriceRange: str("priceRange"),
    schemaGeoLat: str("geoLat"),
    schemaGeoLng: str("geoLng"),
    sitemapProducts: bool("sitemapProducts", true),
    sitemapCategories: bool("sitemapCategories", true),
    sitemapBlog: bool("sitemapBlog", true),
    storefrontPaths,
    sitemapPaths,
  };
}

export function flattenPageSeo(
  pageSeo: unknown,
): Pick<
  SeoSettingsFormValues,
  | "pageAboutTitle"
  | "pageAboutDescription"
  | "pageContactTitle"
  | "pageContactDescription"
  | "pageCareerTitle"
  | "pageCareerDescription"
  | "pageProductsTitle"
  | "pageProductsDescription"
  | "pageBlogTitle"
  | "pageBlogDescription"
  | "pageBrochureTitle"
  | "pageBrochureDescription"
  | "pagePrivacyTitle"
  | "pagePrivacyDescription"
  | "pageTermsTitle"
  | "pageTermsDescription"
  | "pageDisclaimerTitle"
  | "pageDisclaimerDescription"
> {
  const raw =
    pageSeo && typeof pageSeo === "object" && !Array.isArray(pageSeo)
      ? (pageSeo as Record<string, { title?: string; description?: string }>)
      : {};
  const read = (key: string, field: "title" | "description") =>
    typeof raw[key]?.[field] === "string" ? String(raw[key]![field]).trim() : "";
  return {
    pageAboutTitle: read("about", "title"),
    pageAboutDescription: read("about", "description"),
    pageContactTitle: read("contact", "title"),
    pageContactDescription: read("contact", "description"),
    pageCareerTitle: read("career", "title"),
    pageCareerDescription: read("career", "description"),
    pageProductsTitle: read("products", "title"),
    pageProductsDescription: read("products", "description"),
    pageBlogTitle: read("blog", "title"),
    pageBlogDescription: read("blog", "description"),
    pageBrochureTitle: read("brochure", "title"),
    pageBrochureDescription: read("brochure", "description"),
    pagePrivacyTitle: read("privacy", "title"),
    pagePrivacyDescription: read("privacy", "description"),
    pageTermsTitle: read("terms", "title"),
    pageTermsDescription: read("terms", "description"),
    pageDisclaimerTitle: read("disclaimer", "title"),
    pageDisclaimerDescription: read("disclaimer", "description"),
  };
}

export const navigationItemSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  clientKey: z.string().min(1),
  location: z.enum(["header", "footer"]),
  parentId: z.string().uuid().nullable(),
  parentClientKey: z.string().nullable().optional(),
  label: z.string().trim().min(1, "Label is required").max(80),
  href: requiredSafeNavHref,
  sortOrder: z.number().int().min(0).max(10_000),
  isActive: z.boolean(),
  openInNewTab: z.boolean(),
  _delete: z.boolean().optional(),
});

export type NavigationItemFormValues = z.infer<typeof navigationItemSchema>;

export const navigationSettingsSchema = z.object({
  items: z.array(navigationItemSchema).max(200),
});

export type NavigationSettingsFormValues = z.infer<
  typeof navigationSettingsSchema
>;

export const DEFAULT_GENERAL_SETTINGS: GeneralSettingsFormValues = {
  displayName: "Brand Name",
  legalName: "",
  contactEmail: "",
  contactPhone: "",
  contactPhoneSecondary: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: DEFAULT_STORE_COUNTRY,
  phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
  currency: "INR",
  timezone: "Asia/Kolkata",
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
  adminImageMaxMb: 5,
  adminReelVideoMaxMb: 25,
  contactBannerEnabled: false,
  contactBannerImagePath: null,
  contactSpotlightEnabled: false,
  contactSpotlightImagePath: null,
  contactPageHeading: "Let’s connect",
  contactPageSupport: "Our representative will get back to you shortly",
  contactMapEnabled: true,
  contactMapEmbedUrl: null,
  storefrontLoaderStyle: "spinner",
  storefrontLoaderLabel: "Loading…",
};

export const DEFAULT_BRANDING_SETTINGS: BrandingSettingsFormValues = {
  brandName: "Brand Name",
  tagline: "Your store, your brand.",
  logoPath: null,
  logoDarkPath: null,
  faviconPath: null,
  socialSharingImagePath: null,
};

export const DEFAULT_HEADER_SETTINGS: HeaderSettingsFormValues = {
  stickyHeader: true,
  searchEnabled: true,
  cartEnabled: true,
  accountEnabled: true,
  mobileMenuEnabled: true,
  navVisible: true,
  productsCategoryMenu: false,
  logoSize: "large",
  logoHang: "bold",
  announcementEnabled: false,
  announcementText: "",
  announcementUrl: "",
  announcementOpenInNewTab: false,
};

export const DEFAULT_FOOTER_SETTINGS: FooterSettingsFormValues = {
  enabled: true,
  description: "",
  showContact: true,
  showSocial: true,
  showNewsletter: false,
  showLogo: false,
  navVisible: true,
  copyrightText: "",
  showFeaturedProduct: false,
  featuredProductId: null,
};

export const DEFAULT_SEO_SETTINGS: SeoSettingsFormValues = {
  siteTitle: "",
  siteName: "",
  metaDescription: "",
  keywords: "",
  canonicalUrl: "",
  ogTitle: "",
  ogDescription: "",
  ogImagePath: null,
  robotsIndex: true,
  robotsFollow: true,
  googleSiteVerification: "",
  titleTemplate: "",
  twitterHandle: "",
  schemaLocalBusiness: true,
  schemaOrganization: true,
  schemaWebsiteSearch: true,
  schemaBusinessType: "",
  schemaPriceRange: "",
  schemaGeoLat: "",
  schemaGeoLng: "",
  sitemapProducts: true,
  sitemapCategories: true,
  sitemapBlog: true,
  storefrontPaths: DEFAULT_STOREFRONT_PATHS.map((p) => ({ ...p })),
  sitemapPaths: DEFAULT_SITEMAP_PATHS.map((p) => ({ ...p })),
  pageAboutTitle: "",
  pageAboutDescription: "",
  pageContactTitle: "",
  pageContactDescription: "",
  pageCareerTitle: "",
  pageCareerDescription: "",
  pageProductsTitle: "",
  pageProductsDescription: "",
  pageBlogTitle: "",
  pageBlogDescription: "",
  pageBrochureTitle: "",
  pageBrochureDescription: "",
  pagePrivacyTitle: "",
  pagePrivacyDescription: "",
  pageTermsTitle: "",
  pageTermsDescription: "",
  pageDisclaimerTitle: "",
  pageDisclaimerDescription: "",
};
