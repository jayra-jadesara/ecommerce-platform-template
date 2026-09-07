import { z } from "zod";
import {
  LOGO_SIZE_OPTIONS,
  optionalEmail,
  optionalPhone,
  optionalSafeHttpUrl,
  optionalSafeNavHref,
  requiredSafeNavHref,
} from "@/features/admin/settings/validation";

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
  socialWhatsapp: optionalSafeHttpUrl,
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
  logoSize: z.enum(LOGO_SIZE_OPTIONS),
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
  navVisible: z.boolean(),
  copyrightText: optionalText(240),
});

export type FooterSettingsFormValues = z.infer<typeof footerSettingsSchema>;

export const seoSettingsSchema = z.object({
  siteTitle: z.string().trim().min(1, "Site title is required").max(120),
  metaDescription: optionalText(320),
  keywords: optionalText(500),
  canonicalUrl: optionalSafeHttpUrl,
  ogTitle: optionalText(120),
  ogDescription: optionalText(320),
  ogImagePath: z.string().trim().max(512).nullable().optional(),
  robotsIndex: z.boolean(),
  robotsFollow: z.boolean(),
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
  country: "",
  currency: "INR",
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
  logoSize: "medium",
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
  navVisible: true,
  copyrightText: "",
};

export const DEFAULT_SEO_SETTINGS: SeoSettingsFormValues = {
  siteTitle: "Brand Name",
  metaDescription:
    "A reusable white-label e-commerce storefront. Configure brand, theme, and catalog per client.",
  keywords: "",
  canonicalUrl: "",
  ogTitle: "",
  ogDescription: "",
  ogImagePath: null,
  robotsIndex: true,
  robotsFollow: true,
};
