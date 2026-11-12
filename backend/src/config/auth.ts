import "dotenv/config";
import { z } from "zod";

const authConfigSchema = z.object({
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
});

const config = authConfigSchema.parse({
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_ACCESS_TOKEN_TTL_SECONDS: process.env.JWT_ACCESS_TOKEN_TTL_SECONDS,
});

export const authConfig = {
  secret: config.JWT_SECRET,
  accessTokenTtlSeconds: config.JWT_ACCESS_TOKEN_TTL_SECONDS,
  issuer: "personal-expense-manager-api",
  audience: "personal-expense-manager-client",
};
