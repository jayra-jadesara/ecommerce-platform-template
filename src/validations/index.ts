import { z } from "zod";

/**
 * Shared Zod schemas. Feature-specific schemas live under each feature folder.
 * Forms (RHF + Zod) will consume these in later phases.
 */

export const emailSchema = z.string().trim().email("Enter a valid email address");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
