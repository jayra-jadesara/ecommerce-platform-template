import { z } from "zod";
import { optionalSafeUrlSchema } from "@/features/cms/schemas";

export const jobPostFormSchema = z.object({
  title: z.string().trim().min(1, "Enter a job title.").max(200),
  department: z
    .string()
    .trim()
    .min(1, "Enter a department.")
    .max(120),
  position: z.string().trim().min(1, "Enter a position.").max(120),
  location: z.string().trim().max(200).default(""),
  state: z.string().trim().max(120).default(""),
  description: z.string().trim().max(5000).default(""),
  isPublished: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type JobPostFormValues = z.infer<typeof jobPostFormSchema>;

/** 10-digit Indian mobile (national digits only); stored as +91… on submit. */
export const careerPhoneSchema = z
  .string()
  .trim()
  .min(1, "Enter your phone number.")
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number.");

export const careerApplicationFormSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email.").max(200),
  phone: careerPhoneSchema,
  state: z.string().trim().min(1, "Select a state.").max(120),
  city: z.string().trim().min(1, "Select a city.").max(120),
  department: z.string().trim().min(1, "Select a department.").max(120),
  position: z.string().trim().min(1, "Select a position.").max(120),
  jobPostId: z
    .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && String(v).trim() ? String(v) : null)),
  linkedinUrl: optionalSafeUrlSchema.optional().default(null),
  message: z.string().trim().max(2000).default(""),
});

export type CareerApplicationFormValues = z.infer<
  typeof careerApplicationFormSchema
>;

export const careerApplicationStatusSchema = z.enum([
  "NEW",
  "REVIEWED",
  "ARCHIVED",
]);
