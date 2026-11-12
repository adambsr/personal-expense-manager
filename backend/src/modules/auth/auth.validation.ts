import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const registerSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(8).max(128),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(8).max(128),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
