import { z } from "zod";

const categoryTypeSchema = z.enum(["INCOME", "EXPENSE"]);

export const createCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    type: categoryTypeSchema,
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    type: categoryTypeSchema.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, "At least one field must be provided");

export const categoryIdParamsSchema = z
  .object({
    categoryId: z.uuid(),
  })
  .strict();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
