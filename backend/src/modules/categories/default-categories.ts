import type { Prisma } from "../../generated/prisma/client";

export const DEFAULT_CATEGORIES = [
  { name: "Food & Groceries", type: "EXPENSE" },
  { name: "Restaurants & Cafés", type: "EXPENSE" },
  { name: "Transportation", type: "EXPENSE" },
  { name: "Shopping", type: "EXPENSE" },
  { name: "Bills & Utilities", type: "EXPENSE" },
  { name: "Housing & Rent", type: "EXPENSE" },
  { name: "Health & Medical", type: "EXPENSE" },
  { name: "Entertainment", type: "EXPENSE" },
  { name: "Education", type: "EXPENSE" },
  { name: "Travel", type: "EXPENSE" },
  { name: "Personal Care", type: "EXPENSE" },
  { name: "Subscriptions", type: "EXPENSE" },
  { name: "Other Expenses", type: "EXPENSE" },
  { name: "Salary", type: "INCOME" },
  { name: "Freelance", type: "INCOME" },
  { name: "Business", type: "INCOME" },
  { name: "Investments", type: "INCOME" },
  { name: "Gifts", type: "INCOME" },
  { name: "Other Income", type: "INCOME" },
] as const;

export async function ensureDefaultCategories(
  database: Prisma.TransactionClient,
  userId: string,
) {
  await database.category.createMany({
    data: DEFAULT_CATEGORIES.map((category) => ({ ...category, userId })),
    skipDuplicates: true,
  });
}
