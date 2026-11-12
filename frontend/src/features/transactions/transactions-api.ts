import { z } from "zod";
import { clearAccessToken, getAccessToken } from "@/features/auth/auth-session";
import { apiBaseUrl } from "@/lib/api-base-url";
import { notifyTransactionsChanged } from "@/lib/app-events";

const amountSchema = z.string().regex(/^\d+\.\d{2}$/);
const recurrenceFrequencySchema = z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).nullable();
const categorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: z.enum(["INCOME", "EXPENSE"]),
});
const transactionSchema = z.object({
  id: z.uuid(),
  categoryId: z.uuid(),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: amountSchema,
  description: z.string().nullable(),
  occurredAt: z.iso.datetime(),
  recurrenceFrequency: recurrenceFrequencySchema,
  nextOccurrenceAt: z.iso.datetime().nullable(),
});
const listSchema = z.object({
  transactions: z.array(transactionSchema),
  pagination: z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() }),
  summary: z.object({
    activity: z.object({ total: amountSchema, count: z.number().int().nonnegative() }),
    income: z.object({ total: amountSchema, count: z.number().int().nonnegative() }),
    expenses: z.object({ total: amountSchema, count: z.number().int().nonnegative() }),
  }),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type Category = z.infer<typeof categorySchema>;
export type TransactionType = "INCOME" | "EXPENSE";
export type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";
export type TransactionSort = "DATE_DESC" | "DATE_ASC" | "AMOUNT_DESC" | "AMOUNT_ASC" | "DESCRIPTION_ASC";
export type TransactionSummary = z.infer<typeof listSchema>["summary"];
export interface TransactionFilters {
  search: string;
  categoryId: string;
  type: string;
  startDate: string;
  endDate: string;
  sort: TransactionSort;
  page: number;
  limit: number;
}

export class TransactionsApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "TransactionsApiError";
    this.status = status;
  }
}

function getErrorMessage(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null || !("error" in payload)) return undefined;
  const error = payload.error;
  if (typeof error !== "object" || error === null || !("message" in error)) return undefined;
  return typeof error.message === "string" ? error.message : undefined;
}

async function request<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new TransactionsApiError("Your session has expired. Sign in again.", 401);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (response.status === 204) return undefined as T;
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new TransactionsApiError("The server returned an unreadable response.", response.status);
  }
  if (!response.ok) {
    if (response.status === 401) clearAccessToken();
    throw new TransactionsApiError(
      getErrorMessage(payload) ?? "The request could not be completed. Please try again.",
      response.status,
    );
  }
  if (typeof payload !== "object" || payload === null || !("data" in payload)) {
    throw new TransactionsApiError("The server returned an invalid response.", response.status);
  }
  const parsed = schema.safeParse(payload.data);
  if (!parsed.success) throw new TransactionsApiError("The server response did not match the expected format.");
  return parsed.data;
}

function dateQueryValue(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`).toISOString();
}

export async function listTransactions(filters: TransactionFilters, signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) });
  if (filters.categoryId) query.set("categoryId", filters.categoryId);
  if (filters.type) query.set("type", filters.type);
  if (filters.search) query.set("search", filters.search);
  query.set("sort", filters.sort);
  const startDate = dateQueryValue(filters.startDate);
  const endDate = dateQueryValue(filters.endDate, true);
  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);
  return request(`/api/transactions?${query}`, listSchema, { signal });
}

export async function listCategories(signal?: AbortSignal) {
  const schema = z.object({ categories: z.array(categorySchema) });
  const result = await request("/api/categories", schema, { signal });
  return result.categories;
}

export async function createCategory(input: { name: string; type: TransactionType }) {
  const schema = z.object({ category: categorySchema });
  const result = await request("/api/categories", schema, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.category;
}

const transactionEnvelopeSchema = z.object({ transaction: transactionSchema });
export async function saveTransaction(
  input: {
    categoryId: string;
    type: TransactionType;
    amount: string;
    description: string | null;
    occurredAt: string;
    recurrenceFrequency: RecurrenceFrequency | null;
  },
  id?: string,
) {
  const result = await request(`/api/transactions${id ? `/${id}` : ""}`, transactionEnvelopeSchema, {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(input),
  });
  notifyTransactionsChanged();
  return result.transaction;
}

export async function removeTransaction(id: string) {
  await request(`/api/transactions/${id}`, z.undefined(), { method: "DELETE" });
  notifyTransactionsChanged();
}
