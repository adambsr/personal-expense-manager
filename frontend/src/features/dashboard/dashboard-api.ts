import { z } from "zod";
import { clearAccessToken, getAccessToken } from "@/features/auth/auth-session";
import { apiBaseUrl } from "@/lib/api-base-url";

const moneySchema = z.string().regex(/^-?\d+\.\d{2}$/, "Expected a decimal amount string");

const categorySummarySchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  total: moneySchema,
});

const cashFlowBucketSchema = z.object({
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  income: moneySchema,
  expenses: moneySchema,
});

const dashboardSummarySchema = z.object({
  period: z.object({ month: z.number().int().min(1).max(12), year: z.number().int() }),
  totals: z.object({ income: moneySchema, expenses: moneySchema, balance: moneySchema }),
  cashFlow: z.object({
    weekly: z.object({ periodStart: z.iso.date(), periodEnd: z.iso.date(), buckets: z.array(cashFlowBucketSchema) }),
    monthly: z.object({ periodStart: z.iso.date(), periodEnd: z.iso.date(), buckets: z.array(cashFlowBucketSchema) }),
  }),
  incomeByCategory: z.array(categorySummarySchema),
  expensesByCategory: z.array(categorySummarySchema),
  recentTransactions: z.array(
    z.object({
      id: z.string(),
      categoryId: z.string(),
      categoryName: z.string(),
      type: z.enum(["INCOME", "EXPENSE"]),
      amount: moneySchema,
      description: z.string().nullable(),
      occurredAt: z.iso.datetime(),
    }),
  ),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

function getApiErrorMessage(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null || !("error" in payload)) return undefined;
  const error = payload.error;
  if (typeof error !== "object" || error === null || !("message" in error)) return undefined;
  return typeof error.message === "string" ? error.message : undefined;
}

export async function getDashboardSummary(
  month: number,
  year: number,
  signal: AbortSignal,
): Promise<DashboardSummary> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Your session is missing. Sign in to load your financial overview.");
  }

  const query = new URLSearchParams({ month: String(month), year: String(year) });
  const response = await fetch(`${apiBaseUrl}/api/dashboard/summary?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response. Please try again.");
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAccessToken();
      throw new Error("Your session has expired. Sign in again to view your overview.");
    }
    throw new Error(getApiErrorMessage(payload) ?? "The dashboard is unavailable. Please try again.");
  }

  if (typeof payload !== "object" || payload === null || !("data" in payload)) {
    throw new Error("The server returned an invalid dashboard response.");
  }

  const parsed = dashboardSummarySchema.safeParse(payload.data);
  if (!parsed.success) {
    throw new Error("The dashboard response did not match the expected format.");
  }

  return parsed.data;
}
