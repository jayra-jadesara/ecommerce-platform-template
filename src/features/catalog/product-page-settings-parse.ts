import { z } from "zod";
import {
  DEFAULT_PRODUCT_BLOG_HEADING,
  DEFAULT_PRODUCT_DETAIL_SECTIONS,
  DEFAULT_PRODUCT_FAQ_HEADING,
  type ProductDetailSectionDef,
  type ProductFaqQuestionDef,
  type ProductPageSettings,
} from "@/features/catalog/product-page-settings";

export const productDetailSectionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  heading: z.string().trim().min(1, "Enter a heading.").max(80),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: z.boolean(),
});

export const productFaqQuestionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  question: z.string().trim().min(1, "Enter a question.").max(240),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: z.boolean(),
});

export const productPageSettingsSchema = z.object({
  sections: z
    .array(productDetailSectionSchema)
    .min(1, "Add at least one detail section.")
    .max(24),
  faqHeading: z
    .string()
    .trim()
    .min(1, "Enter an FAQ header.")
    .max(80),
  faqQuestions: z.array(productFaqQuestionSchema).max(40),
  listingBannerEnabled: z.boolean(),
  listingBannerImagePath: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  blogEnabled: z.boolean().default(true),
  blogHeading: z
    .string()
    .trim()
    .min(1, "Enter a blog section heading.")
    .max(80)
    .default(DEFAULT_PRODUCT_BLOG_HEADING),
});

export type ProductPageSettingsFormValues = z.infer<
  typeof productPageSettingsSchema
>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseSection(raw: unknown, index: number): ProductDetailSectionDef | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = String(row.id ?? "").trim();
  const heading = String(row.heading ?? "").trim();
  if (!id || !heading) return null;
  return {
    id,
    heading,
    sortOrder:
      typeof row.sortOrder === "number" && Number.isFinite(row.sortOrder)
        ? Math.max(0, Math.round(row.sortOrder))
        : index,
    active: row.active !== false,
  };
}

function parseQuestion(
  raw: unknown,
  index: number,
): ProductFaqQuestionDef | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = String(row.id ?? "").trim();
  const question = String(row.question ?? "").trim();
  if (!id || !question) return null;
  return {
    id,
    question,
    sortOrder:
      typeof row.sortOrder === "number" && Number.isFinite(row.sortOrder)
        ? Math.max(0, Math.round(row.sortOrder))
        : index,
    active: row.active !== false,
  };
}

export function normalizeProductDetailSections(
  raw: unknown,
): ProductDetailSectionDef[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_PRODUCT_DETAIL_SECTIONS.map((s) => ({ ...s }));
  }
  const parsed = raw
    .map((item, index) => parseSection(item, index))
    .filter((item): item is ProductDetailSectionDef => Boolean(item));
  if (!parsed.length) {
    return DEFAULT_PRODUCT_DETAIL_SECTIONS.map((s) => ({ ...s }));
  }
  return parsed
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item, index) => ({ ...item, sortOrder: index }));
}

export function normalizeProductFaqQuestions(
  raw: unknown,
): ProductFaqQuestionDef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => parseQuestion(item, index))
    .filter((item): item is ProductFaqQuestionDef => Boolean(item))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item, index) => ({ ...item, sortOrder: index }));
}

export function normalizeProductPageSettings(input: {
  product_detail_sections?: unknown;
  product_faq_heading?: string | null;
  product_faq_questions?: unknown;
  products_listing_banner_enabled?: boolean | null;
  products_listing_banner_image_path?: string | null;
  product_blog_enabled?: boolean | null;
  product_blog_heading?: string | null;
}): ProductPageSettings {
  const faqHeading =
    String(input.product_faq_heading ?? "").trim() ||
    DEFAULT_PRODUCT_FAQ_HEADING;
  const listingBannerImagePath =
    String(input.products_listing_banner_image_path ?? "").trim() || null;
  const blogHeading =
    String(input.product_blog_heading ?? "").trim() ||
    DEFAULT_PRODUCT_BLOG_HEADING;
  return {
    sections: normalizeProductDetailSections(input.product_detail_sections),
    faqHeading,
    faqQuestions: normalizeProductFaqQuestions(input.product_faq_questions),
    listingBannerEnabled: Boolean(input.products_listing_banner_enabled),
    listingBannerImagePath,
    blogEnabled: input.product_blog_enabled !== false,
    blogHeading,
  };
}

export function parseStringRecord(raw: unknown): Record<string, string> {
  const row = asRecord(raw);
  if (!row) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!key.trim()) continue;
    const text = typeof value === "string" ? value : String(value ?? "");
    out[key] = text;
  }
  return out;
}
