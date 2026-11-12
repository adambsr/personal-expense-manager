import { z } from "zod";

export const dashboardSummaryQuerySchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(1).max(9999).optional(),
  })
  .strict();

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
