import argon2 from "argon2";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { isPrismaErrorCode } from "../../utils/prisma-errors";
import type {
  CreateAdminUserInput, CreateGlobalCategoryInput, ListCategoriesQuery,
  ListUsersQuery, UpdateAdminUserInput, UpdateGlobalCategoryInput,
} from "./admin.validation";

const safeUserSelect = {
  id: true, email: true, firstName: true, lastName: true,
  role: true, isActive: true, createdAt: true, avatarUpdatedAt: true,
  _count: { select: { transactions: true } },
} satisfies Prisma.UserSelect;

export async function bootstrapInitialAdministrator() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env before starting the API.");
  }
  if (!z.email().safeParse(email).success || password.length < 12 || password.length > 128) {
    throw new Error("ADMIN_EMAIL must be valid and ADMIN_PASSWORD must contain 12–128 characters.");
  }
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { role: true, isActive: true } });
  if (existingUser) {
    if (existingUser.role !== "ADMIN") {
      throw new Error("ADMIN_EMAIL belongs to a regular user. Choose a new bootstrap email; existing accounts are never promoted automatically.");
    }
    if (!existingUser.isActive && await prisma.user.count({ where: { role: "ADMIN", isActive: true } }) === 0) {
      throw new Error("The configured bootstrap administrator is inactive and no active administrator exists. Configure a new unused ADMIN_EMAIL.");
    }
    return "existing" as const;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  try {
    await prisma.user.create({ data: { email, passwordHash, role: "ADMIN", firstName: "Admin" } });
    return "created" as const;
  } catch (error) {
    if (!isPrismaErrorCode(error, "P2002")) throw error;
    const concurrentUser = await prisma.user.findUnique({ where: { email }, select: { role: true, isActive: true } });
    if (concurrentUser?.role === "ADMIN" && concurrentUser.isActive) return "existing" as const;
    throw error;
  }
}

export async function getOverview() {
  const [users, transactions, transactionAmounts, registrations, activity] = await Promise.all([
    prisma.user.count(),
    prisma.transaction.count(),
    prisma.$queryRaw<{ type: "INCOME" | "EXPENSE"; total: Prisma.Decimal }[]>(Prisma.sql`
      SELECT c."type"::text AS type, COALESCE(SUM(t."amount"), 0)::numeric AS total
      FROM "Transaction" t JOIN "Category" c ON c."id" = t."categoryId" AND c."userId" = t."userId"
      GROUP BY c."type"`),
    prisma.$queryRaw<{ month: string; total: bigint }[]>(Prisma.sql`
      SELECT to_char(date_trunc('month', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM') AS month, count(*) AS total
      FROM "User" WHERE "createdAt" >= (date_trunc('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '11 months') AT TIME ZONE 'UTC'
      GROUP BY 1 ORDER BY 1`),
    prisma.$queryRaw<{ month: string; type: "INCOME" | "EXPENSE"; total: Prisma.Decimal }[]>(Prisma.sql`
      SELECT to_char(date_trunc('month', t."occurredAt" AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
        c."type"::text AS type, SUM(t."amount")::numeric AS total
      FROM "Transaction" t JOIN "Category" c ON c."id" = t."categoryId" AND c."userId" = t."userId"
      WHERE t."occurredAt" >= (date_trunc('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '11 months') AT TIME ZONE 'UTC'
      GROUP BY 1, 2 ORDER BY 1`),
  ]);
  const activeUsers = await prisma.user.count({ where: { isActive: true } });
  const money = { income: new Prisma.Decimal(0), expenses: new Prisma.Decimal(0) };
  for (const row of transactionAmounts) money[row.type === "INCOME" ? "income" : "expenses"] = row.total;
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCMonth(date.getUTCMonth() - 11 + index);
    return date.toISOString().slice(0, 7);
  });
  const registrationByMonth = new Map(registrations.map((row) => [row.month, Number(row.total)]));
  const activityByMonth = new Map<string, { income: Prisma.Decimal; expenses: Prisma.Decimal }>();
  for (const row of activity) {
    const totals = activityByMonth.get(row.month) ?? { income: new Prisma.Decimal(0), expenses: new Prisma.Decimal(0) };
    totals[row.type === "INCOME" ? "income" : "expenses"] = row.total;
    activityByMonth.set(row.month, totals);
  }
  const recentUsers = await prisma.user.findMany({ select: safeUserSelect, orderBy: { createdAt: "desc" }, take: 5 });
  return {
    totals: { users, activeUsers, transactions, income: money.income.toFixed(2), expenses: money.expenses.toFixed(2) },
    registrations: months.map((month) => ({ month, users: registrationByMonth.get(month) ?? 0 })),
    activity: months.map((month) => {
      const values = activityByMonth.get(month) ?? { income: new Prisma.Decimal(0), expenses: new Prisma.Decimal(0) };
      return { month, income: values.income.toFixed(2), expenses: values.expenses.toFixed(2) };
    }),
    recentUsers: recentUsers.map(({ _count, ...user }) => ({ ...user, transactions: _count.transactions })),
  };
}

export async function listUsers(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = {
    ...(query.search ? { OR: [
      { email: { contains: query.search, mode: "insensitive" } },
      { firstName: { contains: query.search, mode: "insensitive" } },
      { lastName: { contains: query.search, mode: "insensitive" } },
    ] } : {}),
    ...(query.role !== "ALL" ? { role: query.role } : {}),
    ...(query.status !== "ALL" ? { isActive: query.status === "ACTIVE" } : {}),
  };
  const [total, users, administrators, inactive] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, select: safeUserSelect, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { isActive: false } }),
  ]);
  return { users: users.map(({ _count, ...user }) => ({ ...user, transactions: _count.transactions })), page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)), summary: { totalUsers: await prisma.user.count(), administrators, inactive } };
}

export async function getUserDetails(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: safeUserSelect });
  if (!user) return null;
  const [transactions, amounts] = await Promise.all([
    prisma.transaction.findMany({ where: { userId }, orderBy: { occurredAt: "desc" }, take: 20, select: { id: true, amount: true, occurredAt: true, description: true, category: { select: { name: true, type: true } } } }),
    prisma.transaction.count({ where: { userId } }),
  ]);
  const { _count, ...safeUser } = user;
  return { user: { ...safeUser, transactions: _count.transactions }, totalTransactions: amounts, recentTransactions: transactions.map((row) => ({ ...row, amount: row.amount.toFixed(2) })) };
}

export async function createUser(input: CreateAdminUserInput, actorUserId: string) {
  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  try {
    const user = await prisma.$transaction(async (transaction) => {
      const { password, ...profile } = input;
      const created = await transaction.user.create({ data: { ...profile, passwordHash }, select: safeUserSelect });
      const templates = await transaction.globalCategory.findMany({ where: { enabledForNewUsers: true }, select: { name: true, type: true } });
      if (templates.length) await transaction.category.createMany({ data: templates.map((template) => ({ ...template, userId: created.id })), skipDuplicates: true });
      await transaction.adminAuditLog.create({ data: { actorUserId, action: "USER_CREATED", targetId: created.id, details: { role: created.role } } });
      return created;
    });
    const { _count, ...safeUser } = user;
    return { kind: "created" as const, user: { ...safeUser, transactions: _count.transactions } };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) return { kind: "duplicate" as const };
    throw error;
  }
}

export async function updateUser(userId: string, actorId: string, input: UpdateAdminUserInput) {
  if (actorId === userId && (input.role === "USER" || input.isActive === false)) return { kind: "self-protected" as const };
  const result = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(71290461023)::text`);
    const existing = await transaction.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true } });
    if (!existing) return { kind: "not-found" as const };
    const removesLastActiveAdmin = existing.role === "ADMIN" && existing.isActive && (input.role === "USER" || input.isActive === false);
    if (removesLastActiveAdmin) {
      const admins = await transaction.user.count({ where: { role: "ADMIN", isActive: true } });
      if (admins <= 1) return { kind: "last-admin" as const };
    }
    const updated = await transaction.user.update({
      where: { id: userId },
      data: {
        ...(input.role === undefined ? {} : { role: input.role }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
      select: safeUserSelect,
    });
    await transaction.adminAuditLog.create({ data: {
      actorUserId: actorId,
      action: "USER_ACCESS_UPDATED",
      targetId: userId,
      details: { ...(input.role === undefined ? {} : { role: input.role }), ...(input.isActive === undefined ? {} : { isActive: input.isActive }) },
    } });
    return { kind: "updated" as const, user: updated };
  });
  if (result.kind !== "updated") return result;
  const { _count, ...safeUser } = result.user;
  return { kind: "updated" as const, user: { ...safeUser, transactions: _count.transactions } };
}

export async function listGlobalCategories(query: ListCategoriesQuery) {
  const where: Prisma.GlobalCategoryWhereInput = {
    ...(query.type === "ALL" ? {} : { type: query.type }),
    ...(query.search ? { name: { contains: query.search, mode: "insensitive" } } : {}),
  };
  const [total, categories] = await Promise.all([
    prisma.globalCategory.count({ where }),
    prisma.globalCategory.findMany({ where, orderBy: [{ type: "asc" }, { name: "asc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ]);
  const adoptions = await Promise.all(categories.map((category) => prisma.category.groupBy({ by: ["userId"], where: { name: category.name, type: category.type }, _count: { _all: true } })));
  const users = await prisma.user.count();
  return { categories: categories.map((category, index) => { const adoptedUsers = adoptions[index]?.length ?? 0; return { ...category, adoptedUsers, adoptionPercent: users ? Math.round(adoptedUsers / users * 1000) / 10 : 0 }; }), page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) };
}

export async function createGlobalCategory(input: CreateGlobalCategoryInput, actorUserId: string) {
  try {
    const category = await prisma.$transaction(async (transaction) => {
      const created = await transaction.globalCategory.create({ data: input });
      await transaction.adminAuditLog.create({ data: { actorUserId, action: "GLOBAL_CATEGORY_CREATED", targetId: created.id, details: { type: created.type, enabledForNewUsers: created.enabledForNewUsers } } });
      return created;
    });
    return { kind: "created" as const, category };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) return { kind: "duplicate" as const };
    throw error;
  }
}

export async function updateGlobalCategory(categoryId: string, actorUserId: string, input: UpdateGlobalCategoryInput) {
  try {
    const { name, type, icon, color, enabledForNewUsers } = input;
    const category = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.globalCategory.update({ where: { id: categoryId }, data: {
        ...(name === undefined ? {} : { name }),
        ...(type === undefined ? {} : { type }),
        ...(icon === undefined ? {} : { icon }),
        ...(color === undefined ? {} : { color }),
        ...(enabledForNewUsers === undefined ? {} : { enabledForNewUsers }),
      } });
      await transaction.adminAuditLog.create({ data: { actorUserId, action: "GLOBAL_CATEGORY_UPDATED", targetId: categoryId, details: input } });
      return updated;
    });
    return { kind: "updated" as const, category };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2025")) return { kind: "not-found" as const };
    if (isPrismaErrorCode(error, "P2002")) return { kind: "duplicate" as const };
    throw error;
  }
}
