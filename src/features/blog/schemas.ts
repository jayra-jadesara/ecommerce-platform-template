import { z } from "zod";
import { isValidSlug, slugify } from "@/features/catalog/slug";
import { optionalSafeUrlSchema } from "@/features/cms/schemas";
import { listingLayoutPreset } from "@/features/blog/settings-normalize";

export const BLOG_POST_STATUSES = ["draft", "published", "archived"] as const;
export const BLOG_LAYOUT_PRESETS = ["GRID", "LIST", "FEATURED_GRID"] as const;
/** Form values use RIGHT/LEFT/TOP/NONE; legacy SIDEBAR/TOP_FILTER accepted on parse. */
export const BLOG_SIDEBAR_PRESETS = [
  "RIGHT",
  "LEFT",
  "TOP",
  "NONE",
  "SIDEBAR",
  "TOP_FILTER",
] as const;
export const BLOG_CARD_STYLES = ["STANDARD", "MINIMAL", "EDITORIAL"] as const;

export type BlogLayoutPreset = (typeof BLOG_LAYOUT_PRESETS)[number];
export type BlogSidebarPreset = (typeof BLOG_SIDEBAR_PRESETS)[number];
export type BlogCardStyle = (typeof BLOG_CARD_STYLES)[number];

const optionalNullableString = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined(), z.literal("")])
    .transform((v) => {
      if (v == null || v === "") return null;
      const trimmed = v.trim();
      return trimmed ? trimmed.slice(0, max) : null;
    });

const optionalDateTime = z
  .union([z.string(), z.null(), z.undefined(), z.literal("")])
  .transform((v) => {
    if (v == null || v === "") return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  });

/** Reject embedded HTML script vectors that may sneak into markdown. */
function contentLooksSafe(value: string): boolean {
  if (/<script[\s>]/i.test(value)) return false;
  if (/javascript\s*:/i.test(value)) return false;
  if (/\son\w+\s*=/i.test(value)) return false;
  if (/data\s*:\s*text\/html/i.test(value)) return false;
  return true;
}

export const blogPostStatusSchema = z.enum(BLOG_POST_STATUSES);

export const blogCategoryFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name.").max(120),
    /** Optional — auto-derived from name when empty. */
    slug: z.string().trim().max(120).optional().default(""),
    description: optionalNullableString(2000),
    imagePath: optionalNullableString(500),
    isActive: z.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  })
  .transform((data) => ({
    ...data,
    slug: slugify(data.slug?.trim() ? data.slug : data.name),
  }))
  .superRefine((data, ctx) => {
    if (!isValidSlug(data.slug)) {
      ctx.addIssue({
        code: "custom",
        path: ["slug"],
        message: "Use lowercase letters, numbers, and hyphens.",
      });
    }
  });

export type BlogCategoryFormValues = z.infer<typeof blogCategoryFormSchema>;

export const blogPostFormSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a title.").max(200),
    /** Optional — auto-derived from title when empty. */
    slug: z.string().trim().max(120).optional().default(""),
    excerpt: optionalNullableString(1000),
    content: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((v) => (v == null ? "" : v))
      .pipe(
        z
          .string()
          .max(100_000, "Content is too long.")
          .refine(contentLooksSafe, {
            message: "Content contains unsafe HTML or scripts.",
          }),
      ),
    featuredImagePath: optionalNullableString(500),
    authorName: optionalNullableString(120),
    status: blogPostStatusSchema.default("draft"),
    isFeatured: z.boolean().default(false),
    seoTitle: optionalNullableString(200),
    seoDescription: optionalNullableString(500),
    ogImagePath: optionalNullableString(500),
    publishedAt: optionalDateTime,
    categoryIds: z.array(z.string().uuid()).max(10).default([]),
    productIds: z.array(z.string().uuid()).max(12).default([]),
  })
  .transform((data) => ({
    ...data,
    slug: slugify(data.slug?.trim() ? data.slug : data.title),
  }))
  .superRefine((data, ctx) => {
    if (!isValidSlug(data.slug)) {
      ctx.addIssue({
        code: "custom",
        path: ["slug"],
        message: "Use lowercase letters, numbers, and hyphens.",
      });
    }
  });

export type BlogPostFormValues = z.infer<typeof blogPostFormSchema>;

export const blogSettingsFormSchema = z
  .object({
    pageTitle: z
      .string()
      .trim()
      .min(1, "Enter a page title.")
      .max(120)
      .default("Blog"),
    pageDescription: optionalNullableString(500),
    postsPerPage: z.coerce.number().int().min(1).max(48).default(9),
    showCategories: z.boolean().default(true),
    showAuthor: z.boolean().default(true),
    showDate: z.boolean().default(true),
    showReadingTime: z.boolean().default(true),
    showFeaturedImage: z.boolean().default(true),
    showShareButtons: z.boolean().default(true),
    showRelatedPosts: z.boolean().default(true),
    showRelatedProducts: z.boolean().default(true),
    showFeaturedPost: z.boolean().default(true),
    autoFeaturedFallback: z.boolean().default(true),
    showSidebar: z.boolean().default(true),
    showSearch: z.boolean().default(true),
    layoutPreset: z.enum(BLOG_LAYOUT_PRESETS).default("FEATURED_GRID"),
    sidebarPreset: z.enum(BLOG_SIDEBAR_PRESETS).default("RIGHT"),
    cardStyle: z.enum(BLOG_CARD_STYLES).default("STANDARD"),
    featuredPostId: z
      .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
      .transform((v) => (v == null || v === "" ? null : v)),
    ctaTitle: optionalNullableString(120),
    ctaDescription: optionalNullableString(500),
    ctaButtonLabel: optionalNullableString(80),
    ctaButtonHref: optionalSafeUrlSchema,
  })
  .transform((data) => {
    const sidebarPreset =
      data.sidebarPreset === "SIDEBAR"
        ? ("RIGHT" as const)
        : data.sidebarPreset === "TOP_FILTER"
          ? ("TOP" as const)
          : data.sidebarPreset;
    const baseLayout =
      data.layoutPreset === "LIST" ? ("LIST" as const) : ("GRID" as const);
    const layoutPreset = listingLayoutPreset(
      baseLayout,
      data.showFeaturedPost,
    );
    return {
      ...data,
      sidebarPreset,
      layoutPreset,
      showSidebar: sidebarPreset === "NONE" ? false : data.showSidebar,
    };
  });

export type BlogSettingsFormValues = z.infer<typeof blogSettingsFormSchema>;

export const blogListQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  status: z
    .enum(["all", "draft", "published", "archived"])
    .optional()
    .default("all"),
  categoryId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  featured: z
    .enum(["all", "yes", "no", "true", "false"])
    .optional()
    .default("all")
    .transform((v) => {
      if (v === "true") return "yes" as const;
      if (v === "false") return "no" as const;
      return v;
    }),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type BlogListQuery = z.infer<typeof blogListQuerySchema>;

/** @deprecated Prefer blogListQuerySchema */
export const blogPostListQuerySchema = blogListQuerySchema;
/** @deprecated Prefer BlogListQuery */
export type BlogPostListQuery = BlogListQuery;

export const DEFAULT_BLOG_CATEGORY_FORM: BlogCategoryFormValues = {
  name: "",
  slug: "",
  description: null,
  imagePath: null,
  isActive: true,
  sortOrder: 0,
};

export const DEFAULT_BLOG_POST_FORM: BlogPostFormValues = {
  title: "",
  slug: "",
  excerpt: null,
  content: "",
  featuredImagePath: null,
  authorName: null,
  status: "draft",
  isFeatured: false,
  seoTitle: null,
  seoDescription: null,
  ogImagePath: null,
  publishedAt: null,
  categoryIds: [],
  productIds: [],
};

export const DEFAULT_BLOG_SETTINGS: BlogSettingsFormValues = {
  pageTitle: "Blog",
  pageDescription: null,
  postsPerPage: 9,
  showCategories: true,
  showAuthor: true,
  showDate: true,
  showReadingTime: true,
  showFeaturedImage: true,
  showShareButtons: true,
  showRelatedPosts: true,
  showRelatedProducts: true,
  showFeaturedPost: true,
  autoFeaturedFallback: true,
  showSidebar: true,
  showSearch: true,
  layoutPreset: "GRID",
  sidebarPreset: "RIGHT",
  cardStyle: "STANDARD",
  featuredPostId: null,
  ctaTitle: null,
  ctaDescription: null,
  ctaButtonLabel: null,
  ctaButtonHref: null,
};

/** Alias for admin forms */
export const DEFAULT_BLOG_SETTINGS_FORM = DEFAULT_BLOG_SETTINGS;
