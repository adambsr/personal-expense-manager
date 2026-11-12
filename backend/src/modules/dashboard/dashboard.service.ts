import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const RECENT_TRANSACTIONS_LIMIT = 5;

const recentTransactionSelect = {
  id: true,
  categoryId: true,
  amount: true,
  description: true,
  occurredAt: true,
  category: {
    select: {
      name: true,
      type: true,
    },
  },
} satisfies Prisma.TransactionSelect;

type RecentTransaction = Prisma.TransactionGetPayload<{ select: typeof recentTransactionSelect }>;

type CashFlowGranularity = "weekly" | "monthly";
type CashFlowType = "INCOME" | "EXPENSE";

interface CashFlowAggregationRow {
  granularity: CashFlowGranularity;
  periodStart: string;
  type: CashFlowType;
  total: Prisma.Decimal;
}

interface CashFlowTotals {
  income: Prisma.Decimal;
  expenses: Prisma.Decimal;
}

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function utcWeekBoundary(date: Date): Date {
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  const boundary = new Date(date);
  boundary.setUTCHours(0, 0, 0, 0);
  boundary.setUTCDate(boundary.getUTCDate() - mondayOffset);
  return boundary;
}

function addCashFlowTotal(
  totalsByPeriod: Map<string, CashFlowTotals>,
  periodStart: string,
  type: CashFlowType,
  total: Prisma.Decimal,
): void {
  const totals = totalsByPeriod.get(periodStart) ?? {
    income: new Prisma.Decimal(0),
    expenses: new Prisma.Decimal(0),
  };
  if (type === "INCOME") {
    totals.income = totals.income.plus(total);
  } else {
    totals.expenses = totals.expenses.plus(total);
  }
  totalsByPeriod.set(periodStart, totals);
}

function serializeCashFlow(totals: CashFlowTotals) {
  return { income: totals.income.toFixed(2), expenses: totals.expenses.toFixed(2) };
}

function createCashFlowSeries(
  rows: CashFlowAggregationRow[],
  monthStart: Date,
  monthEnd: Date,
  year: number,
  month: number,
) {
  const weeklyTotals = new Map<string, CashFlowTotals>();
  const monthlyTotals = new Map<string, CashFlowTotals>();

  for (const row of rows) {
    const totalsByPeriod = row.granularity === "weekly" ? weeklyTotals : monthlyTotals;
    addCashFlowTotal(totalsByPeriod, row.periodStart, row.type, row.total);
  }

  const weeklyBuckets = [];
  for (let weekStart = utcWeekBoundary(monthStart); weekStart < monthEnd; weekStart = addUtcDays(weekStart, 7)) {
    const weekEnd = addUtcDays(weekStart, 7);
    const bucketStart = weekStart < monthStart ? monthStart : weekStart;
    const bucketEnd = weekEnd > monthEnd ? monthEnd : weekEnd;
    const totals = weeklyTotals.get(utcDateKey(weekStart)) ?? {
      income: new Prisma.Decimal(0),
      expenses: new Prisma.Decimal(0),
    };
    weeklyBuckets.push({
      periodStart: utcDateKey(bucketStart),
      periodEnd: utcDateKey(addUtcDays(bucketEnd, -1)),
      ...serializeCashFlow(totals),
    });
  }

  const monthlyStart = utcMonthBoundary(year, month - 11);
  const monthlyBuckets = [];
  for (let offset = 0; offset < 12; offset += 1) {
    const bucketStart = utcMonthBoundary(year, month - 11 + offset);
    const bucketEnd = utcMonthBoundary(year, month - 10 + offset);
    const periodStart = utcDateKey(bucketStart).slice(0, 7);
    const totals = monthlyTotals.get(periodStart) ?? {
      income: new Prisma.Decimal(0),
      expenses: new Prisma.Decimal(0),
    };
    monthlyBuckets.push({
      periodStart: utcDateKey(bucketStart),
      periodEnd: utcDateKey(addUtcDays(bucketEnd, -1)),
      ...serializeCashFlow(totals),
    });
  }

  return {
    weekly: {
      periodStart: utcDateKey(monthStart),
      periodEnd: utcDateKey(addUtcDays(monthEnd, -1)),
      buckets: weeklyBuckets,
    },
    monthly: {
      periodStart: utcDateKey(monthlyStart),
      periodEnd: utcDateKey(addUtcDays(monthEnd, -1)),
      buckets: monthlyBuckets,
    },
  };
}

function utcMonthBoundary(year: number, month: number): Date {
  const boundary = new Date(0);
  boundary.setUTCFullYear(year, month - 1, 1);
  boundary.setUTCHours(0, 0, 0, 0);
  return boundary;
}

function orderCategoryTotals<T extends { categoryName: string; total: Prisma.Decimal }>(
  left: T,
  right: T,
): number {
  const amountOrder = right.total.comparedTo(left.total);
  if (amountOrder !== 0) return amountOrder;

  return left.categoryName.localeCompare(right.categoryName);
}

function toRecentTransactionResponse(transaction: RecentTransaction) {
  return {
    id: transaction.id,
    categoryId: transaction.categoryId,
    categoryName: transaction.category.name,
    type: transaction.category.type,
    amount: transaction.amount.toFixed(2),
    description: transaction.description,
    occurredAt: transaction.occurredAt,
  };
}

export async function getDashboardSummary(
  userId: string,
  requestedMonth?: number,
  requestedYear?: number,
) {
  const now = new Date();
  const month = requestedMonth ?? now.getUTCMonth() + 1;
  const year = requestedYear ?? now.getUTCFullYear();
  const startDate = utcMonthBoundary(year, month);
  const endDate = utcMonthBoundary(year, month + 1);
  const monthlyChartStart = utcMonthBoundary(year, month - 11);
  const where: Prisma.TransactionWhereInput = {
    userId,
    occurredAt: { gte: startDate, lt: endDate },
  };

  const [categoryGroups, recentTransactions, cashFlowRows] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where,
      _sum: { amount: true },
      orderBy: { categoryId: "asc" },
    }),
    prisma.transaction.findMany({
      where,
      select: recentTransactionSelect,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: RECENT_TRANSACTIONS_LIMIT,
    }),
    prisma.$queryRaw<CashFlowAggregationRow[]>(Prisma.sql`
      WITH chart_transactions AS (
        SELECT t."occurredAt", t."amount", c."type"::text AS "type"
        FROM "Transaction" AS t
        INNER JOIN "Category" AS c
          ON c."id" = t."categoryId"
          AND c."userId" = t."userId"
        WHERE t."userId" = ${userId}::uuid
          AND t."occurredAt" >= ${monthlyChartStart}
          AND t."occurredAt" < ${endDate}
      ), monthly_buckets AS (
        SELECT 'monthly'::text AS "granularity",
          to_char(date_trunc('month', "occurredAt" AT TIME ZONE 'UTC'), 'YYYY-MM') AS "periodStart",
          "type", "amount"
        FROM chart_transactions
      ), weekly_buckets AS (
        SELECT 'weekly'::text AS "granularity",
          to_char(date_trunc('week', "occurredAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS "periodStart",
          "type", "amount"
        FROM chart_transactions
        WHERE "occurredAt" >= ${startDate}
      ), combined_buckets AS (
        SELECT * FROM monthly_buckets
        UNION ALL
        SELECT * FROM weekly_buckets
      )
      SELECT "granularity", "periodStart", "type", SUM("amount") AS "total"
      FROM combined_buckets
      GROUP BY "granularity", "periodStart", "type"
      ORDER BY "granularity", "periodStart", "type"
    `),
  ]);

  const categories =
    categoryGroups.length === 0
      ? []
      : await prisma.category.findMany({
          where: {
            userId,
            id: { in: categoryGroups.map(({ categoryId }) => categoryId) },
          },
          select: { id: true, name: true, type: true },
        });
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  let income = new Prisma.Decimal(0);
  let expenses = new Prisma.Decimal(0);
  const incomeByCategory: { categoryId: string; categoryName: string; total: Prisma.Decimal }[] = [];
  const expensesByCategory: { categoryId: string; categoryName: string; total: Prisma.Decimal }[] = [];

  for (const group of categoryGroups) {
    const category = categoryById.get(group.categoryId);
    if (!category) continue;

    const total = group._sum.amount ?? new Prisma.Decimal(0);
    const categorySummary = {
      categoryId: category.id,
      categoryName: category.name,
      total,
    };

    if (category.type === "INCOME") {
      income = income.plus(total);
      incomeByCategory.push(categorySummary);
    } else {
      expenses = expenses.plus(total);
      expensesByCategory.push(categorySummary);
    }
  }

  incomeByCategory.sort(orderCategoryTotals);
  expensesByCategory.sort(orderCategoryTotals);

  return {
    period: { month, year },
    cashFlow: createCashFlowSeries(cashFlowRows, startDate, endDate, year, month),
    totals: {
      income: income.toFixed(2),
      expenses: expenses.toFixed(2),
      balance: income.minus(expenses).toFixed(2),
    },
    incomeByCategory: incomeByCategory.map(({ total, ...category }) => ({
      ...category,
      total: total.toFixed(2),
    })),
    expensesByCategory: expensesByCategory.map(({ total, ...category }) => ({
      ...category,
      total: total.toFixed(2),
    })),
    recentTransactions: recentTransactions.map(toRecentTransactionResponse),
  };
}
