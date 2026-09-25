import { z } from "zod";

export {
  BROCHURE_PAGE_DESCRIPTION_MAX,
  defaultBrochurePageDescription,
  normalizeBrochurePageDescription,
} from "@/features/brochure/page-description";

export const brochureTitleSchema = z
  .string()
  .trim()
  .min(1, "Enter a title.")
  .max(200, "Title is too long.");

export const brochureCreateSchema = z.object({
  title: brochureTitleSchema,
  pdfPath: z.string().trim().min(1, "Upload a PDF.").max(500),
  fileSizeBytes: z.coerce.number().int().min(0).max(50 * 1024 * 1024),
});

export const brochurePatchSchema = z.object({
  title: brochureTitleSchema.optional(),
  isActive: z.boolean().optional(),
});

export type BrochureCreateValues = z.infer<typeof brochureCreateSchema>;
export type BrochurePatchValues = z.infer<typeof brochurePatchSchema>;
