import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { isPrismaErrorCode } from "../../utils/prisma-errors";
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from "./transactions.validation";

const transactionSelect = {
  id: true,
  categoryId: true,
  amount: true,
  description: true,
  occurredAt: true,
  recurrenceFrequency: true,
  nextOccurrenceAt: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: { type: true },
  },
} satisfies Prisma.TransactionSelect;

type TransactionRecord = Prisma.TransactionGetPayload<{ select: typeof transactionSelect }>;

function toTransactionResponse(transaction: TransactionRecord) {
  return {
    id: transaction.id,
    categoryId: transaction.categoryId,
    type: transaction.category.type,
    amount: transaction.amount.toFixed(2),
    description: transaction.description,
    occurredAt: transaction.occurredAt,
    recurrenceFrequency: transaction.recurrenceFrequency ?? null,
    nextOccurrenceAt: transaction.nextOccurrenceAt?.toISOString() ?? null,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}

function toDecimal(amount: string): Prisma.Decimal {
  return new Prisma.Decimal(amount);
}

function toDate(dateTime: string): Date {
  return new Date(dateTime);
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function getNextOccurrenceDate(
  occurredAt: Date,
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY",
): Date {
  if (frequency === "WEEKLY") {
    return new Date(occurredAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  const year = occurredAt.getUTCFullYear();
  const month = occurredAt.getUTCMonth();
  const day = occurredAt.getUTCDate();
  const hour = occurredAt.getUTCHours();
  const minute = occurredAt.getUTCMinutes();
  const second = occurredAt.getUTCSeconds();
  const millisecond = occurredAt.getUTCMilliseconds();

  if (frequency === "MONTHLY") {
    const nextMonth = month + 1;
    const nextDay = Math.min(day, daysInUtcMonth(year, nextMonth));
    return new Date(Date.UTC(year, nextMonth, nextDay, hour, minute, second, millisecond));
  }

  const nextYear = year + 1;
  const nextDay = Math.min(day, daysInUtcMonth(nextYear, month));
  return new Date(Date.UTC(nextYear, month, nextDay, hour, minute, second, millisecond));
}

function buildTransactionWhere(userId: string, filters: ListTransactionsQuery): Prisma.TransactionWhereInput {
  return {
    userId,
    ...(filters.categoryId === undefined ? {} : { categoryId: filters.categoryId }),
    ...(filters.type === undefined ? {} : { category: { type: filters.type } }),
    ...(filters.search === undefined
      ? {}
      : { description: { contains: filters.search, mode: "insensitive" } }),
    ...((filters.startDate === undefined && filters.endDate === undefined)
      ? {}
      : {
          occurredAt: {
            ...(filters.startDate === undefined ? {} : { gte: toDate(filters.startDate) }),
            ...(filters.endDate === undefined ? {} : { lte: toDate(filters.endDate) }),
          },
        }),
  };
}

function buildOrderBy(sort: ListTransactionsQuery["sort"]): Prisma.TransactionOrderByWithRelationInput[] {
  switch (sort) {
    case "DATE_ASC":
      return [{ occurredAt: "asc" }, { id: "asc" }];
    case "AMOUNT_DESC":
      return [{ amount: "desc" }, { occurredAt: "desc" }, { id: "desc" }];
    case "AMOUNT_ASC":
      return [{ amount: "asc" }, { occurredAt: "asc" }, { id: "asc" }];
    case "DESCRIPTION_ASC":
      return [{ description: "asc" }, { id: "asc" }];
    case "DATE_DESC":
      return [{ occurredAt: "desc" }, { id: "desc" }];
  }
}

function summaryWhere(userId: string, type: "INCOME" | "EXPENSE"): Prisma.TransactionWhereInput {
  return { userId, category: { type } };
}

export async function listTransactions(userId: string, filters: ListTransactionsQuery) {
  const where = buildTransactionWhere(userId, filters);
  const skip = (filters.page - 1) * filters.limit;

  const [records, total, income, expenses] = await Promise.all([
    prisma.transaction.findMany({
      where,
      select: transactionSelect,
      orderBy: buildOrderBy(filters.sort),
      skip,
      take: filters.limit,
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.aggregate({
      where: summaryWhere(userId, "INCOME"),
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.aggregate({
      where: summaryWhere(userId, "EXPENSE"),
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const incomeTotal = income._sum.amount ?? new Prisma.Decimal(0);
  const expenseTotal = expenses._sum.amount ?? new Prisma.Decimal(0);
  const incomeCount = income._count._all;
  const expenseCount = expenses._count._all;

  return {
    transactions: records.map(toTransactionResponse),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
    summary: {
      activity: {
        total: incomeTotal.plus(expenseTotal).toFixed(2),
        count: incomeCount + expenseCount,
      },
      income: { total: incomeTotal.toFixed(2), count: incomeCount },
      expenses: { total: expenseTotal.toFixed(2), count: expenseCount },
    },
  };
}

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, userId },
    select: { id: true, type: true },
  });

  if (!category) return { kind: "invalid-category" as const };
  if (category.type !== input.type) return { kind: "type-mismatch" as const };

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      categoryId: category.id,
      amount: toDecimal(input.amount),
      description: input.description ?? null,
      occurredAt: toDate(input.occurredAt),
      recurrenceFrequency: input.recurrenceFrequency ?? null,
      nextOccurrenceAt: input.recurrenceFrequency
        ? getNextOccurrenceDate(toDate(input.occurredAt), input.recurrenceFrequency)
        : null,
    },
    select: transactionSelect,
  });

  return { kind: "created" as const, transaction: toTransactionResponse(transaction) };
}

export async function getTransaction(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
    select: transactionSelect,
  });

  return transaction ? toTransactionResponse(transaction) : null;
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: UpdateTransactionInput,
) {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
    select: {
      id: true,
      categoryId: true,
      occurredAt: true,
      recurrenceFrequency: true,
      category: { select: { type: true } },
    },
  });

  if (!existing) return { kind: "not-found" as const };

  const categoryId = input.categoryId ?? existing.categoryId;
  const type = input.type ?? existing.category.type;
  const existingFrequency = existing.recurrenceFrequency ?? null;
  const recurrenceFrequency = input.recurrenceFrequency === undefined
    ? existingFrequency
    : input.recurrenceFrequency;
  const shouldUpdateNextOccurrence = recurrenceFrequency === null
    ? input.recurrenceFrequency !== undefined
    : input.occurredAt !== undefined || (
        input.recurrenceFrequency !== undefined && recurrenceFrequency !== existingFrequency
      );
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true, type: true },
  });

  if (!category) return { kind: "invalid-category" as const };
  if (category.type !== type) return { kind: "type-mismatch" as const };

  try {
    const transaction = await prisma.transaction.update({
      where: { id: transactionId, userId },
      data: {
        ...(input.categoryId === undefined ? {} : { categoryId: category.id }),
        ...(input.amount === undefined ? {} : { amount: toDecimal(input.amount) }),
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.occurredAt === undefined ? {} : { occurredAt: toDate(input.occurredAt) }),
        ...(input.recurrenceFrequency === undefined ? {} : { recurrenceFrequency }),
        ...(shouldUpdateNextOccurrence
          ? {
              nextOccurrenceAt: recurrenceFrequency === null
                ? null
                : getNextOccurrenceDate(
                    input.occurredAt === undefined ? existing.occurredAt : toDate(input.occurredAt),
                    recurrenceFrequency,
                  ),
            }
          : {}),
      },
      select: transactionSelect,
    });

    return { kind: "updated" as const, transaction: toTransactionResponse(transaction) };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2025")) return { kind: "not-found" as const };
    if (isPrismaErrorCode(error, "P2003")) return { kind: "invalid-category" as const };
    throw error;
  }
}

export async function deleteTransaction(userId: string, transactionId: string) {
  const result = await prisma.transaction.deleteMany({
    where: { id: transactionId, userId },
  });

  return result.count > 0;
}
