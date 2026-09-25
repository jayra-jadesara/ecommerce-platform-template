import { z } from "zod";
import { zodFieldErrors, type FieldErrors } from "@/lib/validation";

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
  "other_information",
  "career",
  "features",
  "statistics",
  "testimonials",
  "faq",
  "cta",
  "newsletter",
  "reels",
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
  other_information: "Other information",
  career: "Career",
  features: "Features",
  statistics: "Statistics",
  testimonials: "Testimonials",
  faq: "FAQ",
  cta: "Call to Action",
  newsletter: "Newsletter",
  reels: "Reels",
  text: "Text Block",
  image: "Image",
};

export const SECTION_TYPE_DESCRIPTIONS: Record<SupportedSectionType, string> = {
  hero: "Big introduction at the top of your homepage",
  categories: "Show your product categories",
  products: "Show products from your catalog",
  banner: "Promotional image with optional button",
  text_image: "Story block with text beside an image",
  about: "Founder story, portrait, and optional heritage train milestones",
  other_information:
    "Show parts of Content → About on the homepage (same content — no retyping)",
  career: "Careers intro copy and apply-form settings (no CV upload)",
  features: "Highlight why customers choose you",
  statistics: "Key numbers about your business",
  testimonials: "Customer quotes",
  faq: "Common questions and answers",
  cta: "Encourage a next step",
  newsletter: "Email signup form (stores addresses only)",
  reels: "Hosted vertical video carousel with product footers",
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
  /** Legacy field — ignored at render; Motion comes from Appearance. */
  motionSource: z.enum(["global", "custom"]).default("global"),
  animationPreset: z.enum(SECTION_ANIMATION_PRESETS).default("fade-up"),
  animationEnabled: z.boolean().default(true),
  animationIntensity: z.enum(["subtle", "smooth"]).default("smooth"),
  /** Legacy field — ignored at render; accent is last word store-wide. */
  headingHighlight: z.string().max(80).optional().default(""),
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

export const heroSlideSchema = z.object({
  imagePath: z.string().max(500).min(1),
  title: z.string().max(200).optional().default(""),
  subtitle: z.string().max(300).optional().default(""),
  description: z.string().max(500).optional().default(""),
  badge: z.string().max(40).optional().default(""),
  ctaLabel: z.string().max(80).optional().default(""),
  ctaHref: optionalSafeUrlSchema.optional().default(null),
  secondaryCtaLabel: z.string().max(80).optional().default(""),
  secondaryCtaHref: optionalSafeUrlSchema.optional().default(null),
});

export type HeroSlideConfig = z.infer<typeof heroSlideSchema>;

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
  /** Multi-image autoplay carousel (Britannia-style). Empty → legacy single image. */
  slides: z.array(heroSlideSchema).max(8).default([]),
  autoplayMs: z.number().int().min(0).max(30_000).default(5000),
  showArrows: z.boolean().default(true),
  /** Legacy field — ignored at render; 3D comes from Appearance. */
  threeSource: z.enum(["global", "custom"]).default("global"),
  /** Legacy section 3D flags — ignored when threeSource is not applied. */
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

/** Timeline row for About heritage train milestones. */
export const aboutTimelineItemSchema = z.object({
  label: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => String(v ?? "").trim())
    .pipe(z.string().max(200)),
  year: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => String(v ?? "").trim())
    .pipe(z.string().max(40)),
  description: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => String(v ?? "").trim())
    .pipe(z.string().max(500)),
  /** Product/photo — legacy per-stop wheel; storefront uses shared engineWheelImagePath. */
  logoPath: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v == null || v === "" ? null : String(v)))
    .pipe(z.string().max(500).nullable()),
});

/** About page gallery / media card item (factory or certificate). */
export const aboutGallerySlideSchema = z.object({
  imagePath: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v == null || v === "" ? null : String(v)))
    .pipe(z.string().max(500).nullable()),
  title: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => String(v ?? "").trim())
    .pipe(z.string().max(200)),
  description: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => String(v ?? "").trim())
    .pipe(z.string().max(500)),
});

export type AboutGallerySlideConfig = z.infer<typeof aboutGallerySlideSchema>;

export const aboutSectionConfigSchema = sectionCommonSettingsSchema.extend({
  heading: shortTextSchema.default(""),
  description: z.string().max(4000).optional().default(""),
  quote: z.string().max(1000).optional().default(""),
  quoteAuthor: z.string().max(120).optional().default(""),
  imagePath: z.string().max(500).nullable().optional().default(null),
  imageCaptionName: z.string().max(120).optional().default(""),
  imageCaptionRole: z.string().max(120).optional().default(""),
  /** Optional full-bleed page banner (off until enabled + image). */
  bannerEnabled: z.boolean().default(false),
  bannerImagePath: z.string().max(500).nullable().optional().default(null),
  /** Optional shared wheel image — used on locomotive and every bogie. */
  engineWheelImagePath: z
    .string()
    .max(500)
    .nullable()
    .optional()
    .default(null),
  timelineItems: z.array(aboutTimelineItemSchema).max(24).default([]),

  /** Vision & mission band (below story). */
  visionMissionEnabled: z.boolean().default(false),
  visionHeading: shortTextSchema.default("Our Vision"),
  visionText: z.string().max(2000).optional().default(""),
  missionHeading: shortTextSchema.default("Our Mission"),
  missionText: z.string().max(2000).optional().default(""),

  /** Factory media cards (static centered grid — no marquee). */
  factoryEnabled: z.boolean().default(false),
  factoryHeading: shortTextSchema.default("Factory"),
  factorySlides: z.array(aboutGallerySlideSchema).max(8).default([]),

  /** Certificates media cards (separate section). */
  certificatesEnabled: z.boolean().default(false),
  certificatesHeading: shortTextSchema.default("Certificates"),
  certificatesSlides: z.array(aboutGallerySlideSchema).max(8).default([]),

  /**
   * Legacy homepage flags — kept for parse compat.
   * Prefer Homepage → Other information section instead.
   */
  homeShowStory: z.boolean().default(false),
  homeShowVisionMission: z.boolean().default(false),
  homeShowFactory: z.boolean().default(false),
  homeShowCertificates: z.boolean().default(false),
  homeShowTrain: z.boolean().default(false),

  buttonText: z.string().max(80).optional().default(""),
  buttonLink: optionalSafeUrlSchema.optional().default(null),
});

export type AboutSectionConfig = z.infer<typeof aboutSectionConfigSchema>;

/**
 * Homepage section: pick which About-page blocks to show (content from Content → About).
 */
export const otherInformationSectionConfigSchema =
  sectionCommonSettingsSchema.extend({
    showStory: z.boolean().default(true),
    showVisionMission: z.boolean().default(false),
    showFactory: z.boolean().default(false),
    showCertificates: z.boolean().default(false),
    showTrain: z.boolean().default(false),
  });

export type OtherInformationSectionConfig = z.infer<
  typeof otherInformationSectionConfigSchema
>;

/**
 * Migrate legacy combined gallery → factory section before Zod parse.
 * Certificates stay empty so admins can fill them separately.
 */
export function migrateAboutConfigInput(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...raw };
  const hasFactorySlides = Array.isArray(next.factorySlides);
  const legacySlides = Array.isArray(next.gallerySlides)
    ? next.gallerySlides
    : null;

  if (!hasFactorySlides && legacySlides && legacySlides.length > 0) {
    next.factorySlides = legacySlides;
    if (next.factoryEnabled === undefined) {
      next.factoryEnabled = Boolean(next.galleryEnabled);
    }
    if (
      next.factoryHeading === undefined ||
      String(next.factoryHeading ?? "").trim() === ""
    ) {
      next.factoryHeading = "Factory";
    }
  }

  // Drop legacy keys so they are not re-saved after normalize.
  delete next.gallerySlides;
  delete next.galleryEnabled;
  delete next.galleryAutoplayMs;
  delete next.galleryShowArrows;

  return next;
}

/** Career page intro + form settings (jobs live in job_posts table). */
export const careerSectionConfigSchema = sectionCommonSettingsSchema.extend({
  heading: shortTextSchema.default(""),
  /** Optional full-bleed page banner (off until enabled + image). */
  bannerEnabled: z.boolean().default(false),
  bannerImagePath: z.string().max(500).nullable().optional().default(null),
  introParagraphs: z
    .array(
      z
        .union([z.string(), z.null(), z.undefined()])
        .transform((v) => String(v ?? "").trim())
        .pipe(z.string().max(2000)),
    )
    .max(6)
    .default([]),
  /** Short invite under the intro (e.g. “Fill the form below to apply”). */
  ctaText: z.string().max(400).optional().default(""),
  /** Optional override; empty = use store contact email. Must be valid if set. */
  careersEmail: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => String(v ?? "").trim())
    .pipe(
      z.union([
        z.literal(""),
        z
          .string()
          .email("Enter a valid careers email (e.g. hr@yourbrand.com).")
          .max(200),
      ]),
    )
    .default(""),
  formEnabled: z.boolean().default(true),
  formTitle: shortTextSchema.default("Apply now"),
});

export type CareerSectionConfig = z.infer<typeof careerSectionConfigSchema>;

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

export const reelsSectionConfigSchema = sectionCommonSettingsSchema.extend({
  title: shortTextSchema.default("Shop the look"),
  autoplayMuted: z.boolean().default(true),
});

const sectionConfigByType = {
  hero: heroSectionConfigSchema,
  categories: categoriesSectionConfigSchema,
  products: productsSectionConfigSchema,
  banner: bannerSectionConfigSchema,
  text_image: textImageSectionConfigSchema,
  about: aboutSectionConfigSchema,
  other_information: otherInformationSectionConfigSchema,
  career: careerSectionConfigSchema,
  features: featuresSectionConfigSchema,
  statistics: statisticsSectionConfigSchema,
  testimonials: testimonialsSectionConfigSchema,
  faq: faqSectionConfigSchema,
  cta: ctaSectionConfigSchema,
  newsletter: newsletterSectionConfigSchema,
  reels: reelsSectionConfigSchema,
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
  | { ok: false; error: string; fieldErrors?: FieldErrors } {
  if (sectionType === "custom" || !isSupportedSectionType(sectionType)) {
    return { ok: false, error: "Unsupported section type." };
  }
  const schema = sectionConfigByType[sectionType];
  let cleaned = sanitizeSectionConfigInput(config);
  if (sectionType === "about") {
    cleaned = migrateAboutConfigInput(cleaned);
  }
  const parsed = schema.safeParse(cleaned);
  if (parsed.success) {
    return { ok: true, type: sectionType, config: parsed.data };
  }

  // Retry with defaults merged — older drafts / editor-only keys should not hide sections.
  const merged = schema.safeParse({
    ...defaultConfigForType(sectionType),
    ...cleaned,
  });
  if (merged.success) {
    return { ok: true, type: sectionType, config: merged.data };
  }

  const fieldErrors = zodFieldErrors(parsed.error);
  return {
    ok: false,
    error: "Please check the section settings.",
    fieldErrors,
  };
}

/**
 * Drop unknown keys that must not fail storefront parse.
 * Allow-listed motion/3D fields (including optional overrides) pass through
 * section schemas — never strip enable3d / scene3dPreset here.
 */
function sanitizeSectionConfigInput(config: unknown): Record<string, unknown> {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {};
  }
  return { ...(config as Record<string, unknown>) };
}

export function defaultConfigForType(
  type: SupportedSectionType,
): SectionConfigMap[SupportedSectionType] {
  const schema = sectionConfigByType[type];
  return schema.parse({});
}

/** Map leftover homepage About (or homeShow*) flags into Other information toggles. */
export function aboutHomeFlagsToOtherInformationConfig(
  raw: Record<string, unknown> = {},
): OtherInformationSectionConfig {
  const defaults = defaultConfigForType(
    "other_information",
  ) as OtherInformationSectionConfig;
  return {
    ...defaults,
    showStory: Boolean(
      raw.showStory ?? raw.homeShowStory ?? defaults.showStory,
    ),
    showVisionMission: Boolean(
      raw.showVisionMission ??
        raw.homeShowVisionMission ??
        defaults.showVisionMission,
    ),
    showFactory: Boolean(
      raw.showFactory ?? raw.homeShowFactory ?? defaults.showFactory,
    ),
    showCertificates: Boolean(
      raw.showCertificates ??
        raw.homeShowCertificates ??
        defaults.showCertificates,
    ),
    showTrain: Boolean(
      raw.showTrain ?? raw.homeShowTrain ?? defaults.showTrain,
    ),
  };
}

export const pageFormSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
  content: z.string().max(100000).optional().nullable().default(null),
  featuredImagePath: z.string().max(500).nullable().optional().default(null),
  seoTitle: z.string().max(200).optional().nullable().default(null),
  seoDescription: z.string().max(500).optional().nullable().default(null),
  ogImagePath: z.string().max(500).nullable().optional().default(null),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export type PageFormValues = z.infer<typeof pageFormSchema>;

export const BANNER_DEFAULT_BACKGROUND = "#E85D04";

/** Curated bar fills — hex field still accepts any custom #RRGGBB. */
export const BANNER_COLOR_SWATCHES = [
  "#E85D04",
  "#F97316",
  "#EA580C",
  "#DC2626",
  "#B91C1C",
  "#DB2777",
  "#C026D3",
  "#7C3AED",
  "#4F46E5",
  "#2563EB",
  "#0284C7",
  "#0D9488",
  "#059669",
  "#16A34A",
  "#CA8A04",
  "#78716C",
  "#334155",
  "#111827",
] as const;

/** Theme-aligned CTA chip presets (AdminSelect). */
export const BANNER_BUTTON_CHIP_OPTIONS = [
  { value: "Shop now", label: "Shop now" },
  { value: "Shop products", label: "Shop products" },
  { value: "Buy now", label: "Buy now" },
  { value: "Grab offer", label: "Grab offer" },
  { value: "Claim deal", label: "Claim deal" },
  { value: "View deal", label: "View deal" },
  { value: "Explore", label: "Explore" },
  { value: "Learn more", label: "Learn more" },
  { value: "Get started", label: "Get started" },
] as const;

const bannerHexColorSchema = z
  .string()
  .trim()
  .transform((v) => (v.startsWith("#") ? v : `#${v}`))
  .pipe(
    z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Pick a valid hex color.")
      .transform((v) => v.toUpperCase()),
  );

export const bannerFormSchema = z
  .object({
    title: z.string().trim().min(1, "Enter the offer text.").max(120),
    description: z
      .string()
      .trim()
      .max(200)
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null))
      .default(null),
    /** Kept for legacy rows; unused on the coupon-style storefront strip. */
    imagePath: z
      .string()
      .trim()
      .max(500)
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null))
      .default(null),
    backgroundColor: bannerHexColorSchema.default(BANNER_DEFAULT_BACKGROUND),
    linkUrl: optionalSafeUrlSchema.optional().default(null),
    buttonText: z
      .string()
      .trim()
      .max(40)
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null))
      .default(null),
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
    if (data.buttonText && !data.linkUrl?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["linkUrl"],
        message: "Pick where the button should open.",
      });
    }
  });

export type BannerFormValues = z.infer<typeof bannerFormSchema>;

export const HOMEPAGE_SLUG = "home";
/** Dedicated storefront About route (`/about`) — sections managed under Content → About. */
export const ABOUT_PAGE_SLUG = "about";
/** Dedicated storefront Career route (`/career`) — managed under Content → Career. */
export const CAREER_PAGE_SLUG = "career";

/** Reserved storefront legal routes — managed under Content → Legal pages. */
export const PRIVACY_PAGE_SLUG = "privacy";
export const TERMS_PAGE_SLUG = "terms";
export const DISCLAIMER_PAGE_SLUG = "disclaimer";

export const LEGAL_PAGE_SLUGS = [
  PRIVACY_PAGE_SLUG,
  TERMS_PAGE_SLUG,
  DISCLAIMER_PAGE_SLUG,
] as const;

export type LegalPageSlug = (typeof LEGAL_PAGE_SLUGS)[number];

export function isLegalPageSlug(slug: string): slug is LegalPageSlug {
  return (LEGAL_PAGE_SLUGS as readonly string[]).includes(slug);
}

export const LEGAL_PAGE_META: Record<
  LegalPageSlug,
  { title: string; description: string; storefrontPath: string }
> = {
  privacy: {
    title: "Privacy Policy",
    description: "How you collect, use, and protect customer data.",
    storefrontPath: "/privacy",
  },
  terms: {
    title: "Terms of Use",
    description: "Rules for using the store and placing orders.",
    storefrontPath: "/terms",
  },
  disclaimer: {
    title: "Disclaimer",
    description: "General information and liability notice.",
    storefrontPath: "/disclaimer",
  },
};
