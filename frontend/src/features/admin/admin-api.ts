import { z } from "zod";
import { apiBaseUrl } from "@/lib/api-base-url";
import { getAccessToken } from "@/features/auth/auth-session";

const userSchema = z.object({
  id: z.string(), email: z.email(), firstName: z.string(), lastName: z.string(),
  role: z.enum(["USER", "ADMIN"]), isActive: z.boolean(), createdAt: z.iso.datetime(),
  avatarUpdatedAt: z.iso.datetime().nullable(), transactions: z.number().int().nonnegative(),
});
const categorySchema = z.object({
  id: z.string(), name: z.string(), type: z.enum(["INCOME", "EXPENSE"]),
  icon: z.string(), color: z.string(), enabledForNewUsers: z.boolean(),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(), adoptedUsers: z.number().int().nonnegative().optional(),
  adoptionPercent: z.number().optional(),
});
const overviewSchema = z.object({
  totals: z.object({ users: z.number(), activeUsers: z.number(), transactions: z.number(), income: z.string(), expenses: z.string() }),
  registrations: z.array(z.object({ month: z.string(), users: z.number() })),
  activity: z.array(z.object({ month: z.string(), income: z.string(), expenses: z.string() })),
  recentUsers: z.array(userSchema),
});

export type AdminUser = z.infer<typeof userSchema>;
export type GlobalCategory = z.infer<typeof categorySchema>;
export type AdminOverview = z.infer<typeof overviewSchema>;
export interface UserPage {
  users: AdminUser[]; page: number; pageSize: number; total: number; totalPages: number;
  summary: { totalUsers: number; administrators: number; inactive: number };
}
export interface CategoryPage { categories: GlobalCategory[]; page: number; pageSize: number; total: number; totalPages: number }

export class AdminApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.name = "AdminApiError"; this.status = status; }
}

async function request<T>(path: string, schema: z.ZodType<T>, options: { method?: string; body?: unknown } = {}) {
  const token = getAccessToken();
  if (!token) throw new AdminApiError("Your session has expired. Sign in again.", 401);
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/admin${path}`, {
      method: options.method ?? "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(options.body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  } catch {
    throw new AdminApiError("Unable to reach the server. Check your connection and try again.", 0);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = typeof payload === "object" && payload !== null && "error" in payload ? payload.error : null;
    const message = typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" ? error.message : "The request could not be completed.";
    throw new AdminApiError(message, response.status);
  }
  const data = typeof payload === "object" && payload !== null && "data" in payload ? payload.data : payload;
  const result = schema.safeParse(data);
  if (!result.success) throw new AdminApiError("The server returned an invalid administration response.", 502);
  return result.data;
}

export function getAdminOverview() { return request("/overview", overviewSchema); }
export function getAdminUsers(filters: { search: string; role: string; status: string; page: number }) {
  const query = new URLSearchParams({ search: filters.search, role: filters.role, status: filters.status, page: String(filters.page), pageSize: "10" });
  return request(`/users?${query}`, z.object({ users: z.array(userSchema), page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number(), summary: z.object({ totalUsers: z.number(), administrators: z.number(), inactive: z.number() }) })) as Promise<UserPage>;
}
export function getAdminUserDetails(id: string) {
  return request(`/users/${id}`, z.object({ user: userSchema, totalTransactions: z.number(), recentTransactions: z.array(z.object({ id: z.string(), amount: z.string(), occurredAt: z.iso.datetime(), description: z.string().nullable(), category: z.object({ name: z.string(), type: z.enum(["INCOME", "EXPENSE"]) }) })) }));
}
export function createAdminUser(input: { firstName: string; lastName: string; email: string; password: string; role: "USER" | "ADMIN" }) {
  return request("/users", z.object({ kind: z.literal("created"), user: userSchema }), { method: "POST", body: input });
}
export function updateAdminUser(id: string, input: { role?: "USER" | "ADMIN"; isActive?: boolean }) {
  return request(`/users/${id}`, z.object({ kind: z.literal("updated"), user: userSchema }), { method: "PATCH", body: input });
}
export function getAdminCategories(filters: { search: string; type: string; page: number }) {
  const query = new URLSearchParams({ search: filters.search, type: filters.type, page: String(filters.page), pageSize: "10" });
  return request(`/categories?${query}`, z.object({ categories: z.array(categorySchema), page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() })) as Promise<CategoryPage>;
}
export function createGlobalCategory(input: { name: string; type: "INCOME" | "EXPENSE"; icon: string; color: string; enabledForNewUsers: boolean }) {
  return request("/categories", z.object({ kind: z.literal("created"), category: categorySchema }), { method: "POST", body: input });
}
export function updateGlobalCategory(id: string, input: Partial<{ name: string; type: "INCOME" | "EXPENSE"; icon: string; color: string; enabledForNewUsers: boolean }>) {
  return request(`/categories/${id}`, z.object({ kind: z.literal("updated"), category: categorySchema }), { method: "PATCH", body: input });
}
