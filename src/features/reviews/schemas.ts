import { z } from "zod";

export const reviewRatingSchema = z
  .number({
    required_error: "Choose a rating from 1 to 5.",
    invalid_type_error: "Choose a rating from 1 to 5.",
  })
  .int("Choose a rating from 1 to 5.")
  .min(1, "Choose a rating from 1 to 5.")
  .max(5, "Choose a rating from 1 to 5.");

export const submitProductReviewSchema = z.object({
  productId: z.string().uuid("Invalid product."),
  rating: reviewRatingSchema,
  title: z
    .string()
    .trim()
    .max(120, "Title must be 120 characters or fewer.")
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  body: z
    .string()
    .trim()
    .max(4000, "Review must be 4000 characters or fewer.")
    .optional()
    .transform((v) => v ?? ""),
});

export type SubmitProductReviewValues = z.infer<
  typeof submitProductReviewSchema
>;

export const productReviewStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "hidden",
]);

export const reviewSortSchema = z.enum(["newest", "highest", "lowest"]);
