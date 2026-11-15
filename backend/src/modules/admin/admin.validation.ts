import { z } from "zod";

const uuid = z.uuid();
const email = z.string().trim().toLowerCase().pipe(z.email());
const name = z.string().trim().min(1).max(80);
const categoryType = z.enum(["INCOME", "EXPENSE"]);
const icon = z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/i);
const color = z.string().regex(/^#[0-9a-f]{6}$/i);

export const listUsersQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  role: z.enum(["USER", "ADMIN", "ALL"]).default("ALL"),
  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export const userIdParamsSchema = z.object({ userId: uuid }).strict();

export const createAdminUserSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  password: z.string().min(12).max(128),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
}).strict();

export const updateAdminUserSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
}).strict().refine((input) => Object.keys(input).length > 0);

export const listCategoriesQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  type: z.enum(["INCOME", "EXPENSE", "ALL"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export const createGlobalCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  type: categoryType,
  icon,
  color,
  enabledForNewUsers: z.boolean().default(true),
}).strict();

export const updateGlobalCategorySchema = createGlobalCategorySchema.partial().refine((input) => Object.keys(input).length > 0);
export const categoryIdParamsSchema = z.object({ categoryId: uuid }).strict();

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CreateGlobalCategoryInput = z.infer<typeof createGlobalCategorySchema>;
export type UpdateGlobalCategoryInput = z.infer<typeof updateGlobalCategorySchema>;
