import { z } from "zod";

/** Allow-listed animation presets — never arbitrary CSS/JS. */
export const SECTION_ANIMATION_PRESETS = [
  "fade",
  "fade-up",
  "fade-down",
  "slide-up",
  "slide-down",
  "scale",
  "none",
] as const;

export const SECTION_BACKGROUND_STYLES = [
  "default",
  "surface",
  "primary-soft",
  "accent-soft",
  "dark",
] as const;

export const SECTION_SPACING_PRESETS = ["compact", "normal", "spacious"] as const;

/** Icon identifiers for feature cards — no arbitrary SVG/HTML. */
export const FEATURE_ICON_IDS = [
  "star",
  "shield",
  "truck",
  "heart",
  "leaf",
  "check",
  "globe",
  "clock",
  "package",
  "support",
] as const;

/**
 * Supported section types for the builder + storefront renderer.
 * `custom` exists in DB history but is rejected by app validation/rendering.
 */
export const SUPPORTED_SECTION_TYPES = [
  "hero",
  "categories",
  "products",
  "banner",
  "text_image",
  "about",
  "features",
  "statistics",
  "testimonials",
  "faq",
  "cta",
  "newsletter",
  "text",
  "image",
] as const;

export type SupportedSectionType = (typeof SUPPORTED_SECTION_TYPES)[number];

export const SECTION_TYPE_LABELS: Record<SupportedSectionType, string> = {
  hero: "Hero Banner",
  categories: "Categories",
  products: "Product Grid",
  banner: "Image Banner",
  text_image: "Text + Image",
  about: "About",
  features: "Features",
  statistics: "Statistics",
  testimonials: "Testimonials",
  faq: "FAQ",
  cta: "Call to Action",
  newsletter: "Newsletter",
  text: "Text Block",
  image: "Image",
};

export const SECTION_TYPE_DESCRIPTIONS: Record<SupportedSectionType, string> = {
  hero: "Big introduction at the top of your homepage",
  categories: "Show your product categories",
  products: "Show products from your catalog",
  banner: "Promotional image with optional button",
  text_image: "Story block with text beside an image",
  about: "Tell customers about your business",
  features: "Highlight why customers choose you",
  statistics: "Key numbers about your business",
  testimonials: "Customer quotes",
  faq: "Common questions and answers",
  cta: "Encourage a next step",
  newsletter: "Email signup form (stores addresses only)",
  text: "Simple text block",
  image: "Single image block",
};

/** Safe internal or absolute http(s) URLs — no javascript: / data: schemes. */
export const safeUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => {
      if (!value) return true;
      if (value.startsWith("/")) {
        return !value.startsWith("//") && !value.includes("\\");
      }
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Enter a safe link (internal path or https URL)." },
  );

export const optionalSafeUrlSchema = z
  .union([z.string(), z.null(), z.undefined(), z.literal("")])
  .transform((v) => {
    if (v == null || v === "") return null;
    return v.trim();
  })
  .pipe(safeUrlSchema.nullable());

export const plainTextSchema = z
  .string()
  .max(5000)
  .transform((v) => v.trim());

export const shortTextSchema = z
  .string()
  .max(200)
  .transform((v) => v.trim());

export const sectionCommonSettingsSchema = z.object({
  backgroundStyle: z.enum(SECTION_BACKGROUND_STYLES).default("default"),
  spacingPreset: z.enum(SECTION_SPACING_PRESETS).default("normal"),
  animationPreset: z.enum(SECTION_ANIMATION_PRESETS).default("fade-up"),
  animationEnabled: z.boolean().default(true),
});

export type SectionCommonSettings = z.infer<typeof sectionCommonSettingsSchema>;

export const HERO_LAYOUT_PRESETS = [
  "SPLIT",
  "CENTERED",
  "FULL_BLEED",
  "IMAGE_RIGHT",
  "IMAGE_LEFT",
] as const;

export type HeroLayoutPreset = (typeof HERO_LAYOUT_PRESETS)[number];

export const HERO_LAYOUT_PRESET_LABELS: Record<HeroLayoutPreset, string> = {
  SPLIT: "Split (text + visual)",
  CENTERED: "Centered",
  FULL_BLEED: "Full-bleed overlay",
  IMAGE_RIGHT: "Image right",
  IMAGE_LEFT: "Image left",
};

export const heroSectionConfigSchema = sectionCommonSettingsSchema.extend({
  title: shortTextSchema.default(""),
  subtitle: z.string().max(300).optional().default(""),
  description: z.string().max(2000).optional().default(""),
  backgroundImagePath: z.string().max(500).nullable().optional().default(null),
  foregroundImagePath: z.string().max(500).nullable().optional().default(null),
  primaryButtonText: z.string().max(80).optional().default(""),
  primaryButtonLink: optionalSafeUrlSchema.optional().default(null),
  secondaryButtonText: z.string().max(80).optional().default(""),
  secondaryButtonLink: optionalSafeUrlSchema.optional().default(null),
  alignment: z.enum(["left", "center", "right"]).default("left"),
  /** Safe layout presets — never arbitrary CSS/JS from the database. */
  layoutPreset: z.enum(HERO_LAYOUT_PRESETS).default("SPLIT"),
  /** Optional decorative 3D — allow-listed preset only; never arbitrary code. */
  enable3d: z.boolean().default(false),
  scene3dPreset: z
    .enum([
      "NONE",
      "FLOATING_SHAPES",
      "PRODUCT_ORBIT",
      "ABSTRACT_PARTICLES",
      "SOFT_GEOMETRY",
    ])
    .default("NONE"),
  scene3dRotationSpeed: z.number().min(0).max(2).default(0.25),
  scene3dCameraDistance: z.number().min(2).max(12).default(4.5),
});

export const categoriesSectionConfigSchema = sectionCommonSettingsSchema.extend({
  title: shortTextSchema.default("Shop by category"),
  description: z.string().max(1000).optional().default(""),
  categoryIds: z.array(z.string().uuid()).max(24).default([]),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
});

export const productsSectionConfigSchema = sectionCommonSettingsSchema.extend({
  title: shortTextSchema.default("Featured products"),
  description: z.string().max(1000).optional().default(""),
  source: z
    .enum([
      "FEATURED_PRODUCTS",
      "LATEST_PRODUCTS",
      "SELECTED_PRODUCTS",
      "CATEGORY_PRODUCTS",
    ])
    .default("FEATURED_PRODUCTS"),
  productIds: z.array(z.string().uuid()).max(24).default([]),
  categoryId: z.string().uuid().nullable().optional().default(null),
  limit: z.number().int().min(1).max(24).default(8),
});

export const bannerSectionConfigSchema = sectionCommonSettingsSchema.extend({
  title: shortTextSchema.default(""),
  description: z.string().max(1000).optional().default(""),
  imagePath: z.string().max(500).nullable().optional().default(null),
  buttonText: z.string().max(80).optional().default(""),
  link: optionalSafeUrlSchema.optional().default(null),
  alignment: z.enum(["left", "center", "right"]).default("center"),
  overlayStyle: z.enum(["none", "soft", "strong"]).default("soft"),
});

export const textImageSectionConfigSchema = sectionCommonSettingsSchema.extend({
  heading: shortTextSchema.default(""),
  description: z.string().max(4000).optional().default(""),
  imagePath: z.string().max(500).nullable().optional().default(null),
  imagePosition: z.enum(["left", "right"]).default("right"),
  buttonText: z.string().max(80).optional().default(""),
  buttonLink: optionalSafeUrlSchema.optional().default(null),
});

export const aboutSectionConfigSchema = sectionCommonSettingsSchema.extend({
  heading: shortTextSchema.default(""),
  description: z.string().max(4000).optional().default(""),
  imagePath: z.string().max(500).nullable().optional().default(null),
  buttonText: z.string().max(80).optional().default(""),
  buttonLink: optionalSafeUrlSchema.optional().default(null),
});

export const featureItemSchema = z.object({
  icon: z.enum(FEATURE_ICON_IDS).default("star"),
  title: shortTextSchema,
  description: z.string().max(500).default(""),
});

export const featuresSectionConfigSchema = sectionCommonSettingsSchema.extend({
  title: shortTextSchema.default(""),
  description: z.string().max(1000).optional().default(""),
  items: z.array(featureItemSchema).max(12).default([]),
});

export const statisticItemSchema = z.object({
  value: z.string().max(40),
  label: z.string().max(80),
});

export const statisticsSectionConfigSchema = sectionCommonSettingsSchema.extend({
  title: shortTextSchema.default(""),
  items: z.array(statisticItemSchema).max(8).default([]),
});

export const testimonialItemSchema = z.object({
  customerName: shortTextSchema,
  companyOrTitle: z.string().max(120).optional().default(""),
  quote: z.string().max(1000),
  imagePath: z.string().max(500).nullable().optional().default(null),
  rating: z.number().int().min(1).max(5).nullable().optional().default(null),
});

export const testimonialsSectionConfigSchema = sectionCommonSettingsSchema.extend({
  title: shortTextSchema.default(""),
  items: z.array(testimonialItemSchema).max(12).default([]),
});

export const faqItemSchema = z.object({
  question: shortTextSchema,
  answer: z.string().max(4000),
  active: z.boolean().default(true),
});

export const faqSectionConfigSchema = sectionCommonSettingsSchema.extend({
  title: shortTextSchema.default("FAQ"),
  items: z.array(faqItemSchema).max(40).default([]),
});

export const ctaSectionConfigSchema = sectionCommonSettingsSchema.extend({
  heading: shortTextSchema.default(""),
  description: z.string().max(1000).optional().default(""),
  buttonText: z.string().max(80).optional().default(""),
  buttonLink: optionalSafeUrlSchema.optional().default(null),
});

export const newsletterSectionConfigSchema = sectionCommonSettingsSchema.extend({
  heading: shortTextSchema.default("Stay in the loop"),
  description: z
    .string()
    .max(1000)
    .optional()
    .default("Get updates about new products and offers."),
  buttonText: z.string().max(80).optional().default("Subscribe"),
  successMessage: z
    .string()
    .max(200)
    .optional()
    .default("Thanks — you're on the list."),
});

export const textSectionConfigSchema = sectionCommonSettingsSchema.extend({
  heading: shortTextSchema.default(""),
  body: z.string().max(8000).optional().default(""),
});

export const imageSectionConfigSchema = sectionCommonSettingsSchema.extend({
  imagePath: z.string().max(500).nullable().optional().default(null),
  altText: z.string().max(200).optional().default(""),
  caption: z.string().max(300).optional().default(""),
});

const sectionConfigByType = {
  hero: heroSectionConfigSchema,
  categories: categoriesSectionConfigSchema,
  products: productsSectionConfigSchema,
  banner: bannerSectionConfigSchema,
  text_image: textImageSectionConfigSchema,
  about: aboutSectionConfigSchema,
  features: featuresSectionConfigSchema,
  statistics: statisticsSectionConfigSchema,
  testimonials: testimonialsSectionConfigSchema,
  faq: faqSectionConfigSchema,
  cta: ctaSectionConfigSchema,
  newsletter: newsletterSectionConfigSchema,
  text: textSectionConfigSchema,
  image: imageSectionConfigSchema,
} as const;

export type SectionConfigMap = {
  [K in keyof typeof sectionConfigByType]: z.infer<(typeof sectionConfigByType)[K]>;
};

export function isSupportedSectionType(
  value: string,
): value is SupportedSectionType {
  return (SUPPORTED_SECTION_TYPES as readonly string[]).includes(value);
}

export function parseSectionConfig(
  sectionType: string,
  config: unknown,
):
  | { ok: true; type: SupportedSectionType; config: SectionConfigMap[SupportedSectionType] }
  | { ok: false; error: string } {
  if (sectionType === "custom" || !isSupportedSectionType(sectionType)) {
    return { ok: false, error: "Unsupported section type." };
  }
  const schema = sectionConfigByType[sectionType];
  const parsed = schema.safeParse(config ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid section settings.",
    };
  }
  return { ok: true, type: sectionType, config: parsed.data };
}

export function defaultConfigForType(
  type: SupportedSectionType,
): SectionConfigMap[SupportedSectionType] {
  const schema = sectionConfigByType[type];
  return schema.parse({});
}

export const pageFormSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
  content: z.string().max(50000).optional().nullable().default(null),
  featuredImagePath: z.string().max(500).nullable().optional().default(null),
  seoTitle: z.string().max(200).optional().nullable().default(null),
  seoDescription: z.string().max(500).optional().nullable().default(null),
  ogImagePath: z.string().max(500).nullable().optional().default(null),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export type PageFormValues = z.infer<typeof pageFormSchema>;

export const bannerFormSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a title.").max(200),
    description: z.string().max(1000).optional().nullable().default(null),
    imagePath: z.string().max(500).nullable().optional().default(null),
    linkUrl: optionalSafeUrlSchema.optional().default(null),
    buttonText: z.string().max(80).optional().nullable().default(null),
    isActive: z.boolean().default(true),
    startsAt: z
      .union([z.string(), z.null(), z.undefined(), z.literal("")])
      .transform((v) => {
        if (v == null || v === "") return null;
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
      }),
    endsAt: z
      .union([z.string(), z.null(), z.undefined(), z.literal("")])
      .transform((v) => {
        if (v == null || v === "") return null;
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
      }),
    sortOrder: z.number().int().min(0).max(9999).default(0),
  })
  .superRefine((data, ctx) => {
    if (data.startsAt && data.endsAt) {
      if (new Date(data.endsAt).getTime() < new Date(data.startsAt).getTime()) {
        ctx.addIssue({
          code: "custom",
          path: ["endsAt"],
          message: "End date must be on or after the start date.",
        });
      }
    }
  });

export type BannerFormValues = z.infer<typeof bannerFormSchema>;

export const HOMEPAGE_SLUG = "home";
