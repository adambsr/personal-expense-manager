import "dotenv/config";
import { createHash } from "node:crypto";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const DATABASE_URL = process.env.DATABASE_URL;
const USER_COUNT = 50;
const DEMO_PASSWORD = "DemoFinance123!";
const EMAIL_DOMAIN = "example.com";

const globalCategories = [
  { name: "Salary", type: "INCOME", icon: "briefcase", color: "#16a34a" },
  { name: "Freelance", type: "INCOME", icon: "laptop", color: "#059669" },
  { name: "Reimbursement", type: "INCOME", icon: "rotate-ccw", color: "#0d9488" },
  { name: "Housing", type: "EXPENSE", icon: "house", color: "#7c3aed" },
  { name: "Groceries", type: "EXPENSE", icon: "shopping-basket", color: "#ea580c" },
  { name: "Transport", type: "EXPENSE", icon: "car", color: "#2563eb" },
  { name: "Dining", type: "EXPENSE", icon: "utensils", color: "#db2777" },
  { name: "Utilities", type: "EXPENSE", icon: "bolt", color: "#ca8a04" },
  { name: "Health", type: "EXPENSE", icon: "heart-pulse", color: "#e11d48" },
  { name: "Entertainment", type: "EXPENSE", icon: "clapperboard", color: "#9333ea" },
  { name: "Shopping", type: "EXPENSE", icon: "shopping-bag", color: "#0891b2" },
] as const;

const firstNames = [
  "Alex", "Amira", "Avery", "Camille", "Dalia", "Elias", "Farah", "Gabriel", "Hana", "Idris",
  "Ines", "Jules", "Karim", "Lina", "Malik", "Maya", "Nadia", "Noah", "Rania", "Samir",
  "Sara", "Sofia", "Tariq", "Yasmine", "Zayn",
];
const lastNames = [
  "Bennett", "Carter", "Diallo", "Ellis", "Fischer", "Garcia", "Haddad", "Ibrahim", "Jensen", "Klein",
  "Lopez", "Martin", "Nasser", "Olsen", "Patel", "Quinn", "Rahman", "Santos", "Turner", "Walker",
];

type DemoUser = { id: string; email: string; firstName: string; lastName: string; createdAt: Date };
type DemoCategory = { id: string; userId: string; name: string; type: "INCOME" | "EXPENSE" };

function assertLocalDatabase(databaseUrl: string | undefined): string {
  if (!databaseUrl) throw new Error("DATABASE_URL must be defined in backend/.env.");
  const host = new URL(databaseUrl).hostname.toLowerCase();
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host) && process.env.DEMO_SEED_ALLOW_REMOTE !== "true") {
    throw new Error("Demo seeding is limited to localhost. Set DEMO_SEED_ALLOW_REMOTE=true only when a remote target is intentional.");
  }
  return databaseUrl;
}

function stableUuid(value: string): string {
  const bytes = createHash("sha1").update(`personal-expense-manager-demo:${value}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function randomGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function amountBetween(random: () => number, minimum: number, maximum: number): string {
  const minorUnits = Math.floor(random() * (maximum - minimum + 1)) + minimum;
  return `${Math.floor(minorUnits / 100)}.${String(minorUnits % 100).padStart(2, "0")}`;
}

function userCreatedAt(index: number, now: Date): Date {
  const monthOffset = 11 - (index % 12);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthOffset, 1));
}

function occurredAt(userIndex: number, monthOffset: number, transactionIndex: number, now: Date): Date {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthOffset, 1));
  const maximumDay = monthOffset === 0 ? Math.max(1, now.getUTCDate()) : 28;
  const day = 1 + ((userIndex * 7 + monthOffset * 3 + transactionIndex * 5) % maximumDay);
  const hour = 8 + ((userIndex + transactionIndex) % 12);
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), day, hour));
}

function demoTransactionData(
  users: DemoUser[],
  categories: DemoCategory[],
  now: Date,
) {
  const categoryByUserAndName = new Map(categories.map((category) => [`${category.userId}:${category.type}:${category.name}`, category.id]));
  const rows = [];

  for (const [userIndex, user] of users.entries()) {
    const signupOffset = 11 - (userIndex % 12);
    const random = randomGenerator(userIndex + 1);
    for (let monthOffset = 0; monthOffset <= signupOffset; monthOffset += 1) {
      const monthLabel = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" })
        .format(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthOffset, 1)));
      const items = [
        { name: "Salary", type: "INCOME" as const, amount: amountBetween(random, 180_000, 460_000), description: `Monthly salary · ${monthLabel}` },
        { name: "Housing", type: "EXPENSE" as const, amount: amountBetween(random, 65_000, 135_000), description: `Monthly rent · ${monthLabel}` },
        { name: "Groceries", type: "EXPENSE" as const, amount: amountBetween(random, 8_000, 34_000), description: `Weekly groceries · ${monthLabel}` },
        { name: "Groceries", type: "EXPENSE" as const, amount: amountBetween(random, 7_000, 29_000), description: `Market shopping · ${monthLabel}` },
        { name: "Transport", type: "EXPENSE" as const, amount: amountBetween(random, 2_500, 18_000), description: `Local transport · ${monthLabel}` },
        { name: "Dining", type: "EXPENSE" as const, amount: amountBetween(random, 2_000, 14_000), description: `Meals out · ${monthLabel}` },
        { name: "Utilities", type: "EXPENSE" as const, amount: amountBetween(random, 7_000, 24_000), description: `Household utilities · ${monthLabel}` },
      ];

      if ((userIndex + monthOffset) % 3 === 0) {
        items.push({ name: "Freelance", type: "INCOME", amount: amountBetween(random, 18_000, 95_000), description: `Contract work · ${monthLabel}` });
      }
      if ((userIndex + monthOffset) % 4 === 0) {
        items.push({ name: "Health", type: "EXPENSE", amount: amountBetween(random, 4_000, 22_000), description: `Pharmacy and care · ${monthLabel}` });
      }

      for (const [transactionIndex, item] of items.entries()) {
        const categoryId = categoryByUserAndName.get(`${user.id}:${item.type}:${item.name}`);
        if (!categoryId) throw new Error(`Missing demo category ${item.name} for ${user.email}.`);
        rows.push({
          id: stableUuid(`transaction:${user.id}:${monthOffset}:${transactionIndex}`),
          userId: user.id,
          categoryId,
          amount: item.amount,
          description: item.description,
          occurredAt: occurredAt(userIndex, monthOffset, transactionIndex, now),
        });
      }
    }
  }

  return rows;
}

async function seedDemoData() {
  const adapter = new PrismaPg({ connectionString: assertLocalDatabase(DATABASE_URL) });
  const prisma = new PrismaClient({ adapter });
  const now = new Date();

  try {
    const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });
    const users: DemoUser[] = Array.from({ length: USER_COUNT }, (_, offset) => {
      const index = offset;
      const firstName = firstNames[index % firstNames.length];
      const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
      const email = index === 0
        ? `demo.user@${EMAIL_DOMAIN}`
        : `member${String(index + 1).padStart(2, "0")}@${EMAIL_DOMAIN}`;
      return {
        id: stableUuid(`user:${email}`),
        email,
        firstName: index === 0 ? "Demo" : firstName,
        lastName: index === 0 ? "Member" : lastName,
        createdAt: userCreatedAt(index, now),
      };
    });

    await prisma.$transaction(async (transaction) => {
      await transaction.globalCategory.createMany({
        data: globalCategories.map((category) => ({ ...category, id: stableUuid(`global-category:${category.type}:${category.name}`) })),
        skipDuplicates: true,
      });

      await transaction.user.createMany({
        data: users.map((user) => ({
          ...user,
          passwordHash,
          role: "USER" as const,
          isActive: true,
          updatedAt: user.createdAt,
        })),
        skipDuplicates: true,
      });

      const storedUsers = await transaction.user.findMany({
        where: { id: { in: users.map((user) => user.id) } },
        select: { id: true, email: true, role: true },
      });
      const userById = new Map(storedUsers.map((user) => [user.id, user]));
      for (const user of users) {
        const storedUser = userById.get(user.id);
        if (storedUser?.email !== user.email || storedUser.role !== "USER") {
          throw new Error(`Demo account ${user.email} conflicts with existing account data; no demo data was added.`);
        }
      }

      const categoriesForUsers = users.flatMap((user) => globalCategories.map((category) => ({
        id: stableUuid(`category:${user.id}:${category.type}:${category.name}`),
        userId: user.id,
        name: category.name,
        type: category.type,
        createdAt: user.createdAt,
        updatedAt: user.createdAt,
      })));
      await transaction.category.createMany({ data: categoriesForUsers, skipDuplicates: true });

      const storedCategories = await transaction.category.findMany({
        where: { userId: { in: users.map((user) => user.id) } },
        select: { id: true, userId: true, name: true, type: true },
      });
      const rows = demoTransactionData(users, storedCategories, now);
      await transaction.transaction.createMany({ data: rows, skipDuplicates: true });
      return rows.length;
    }, { maxWait: 10_000, timeout: 120_000 });

    const [seededUsers, seededTransactions, transactionsByUser, demoUser] = await Promise.all([
      prisma.user.count({ where: { id: { in: users.map((user) => user.id) } } }),
      prisma.transaction.count({ where: { userId: { in: users.map((user) => user.id) } } }),
      prisma.transaction.groupBy({
        by: ["userId"],
        where: { userId: { in: users.map((user) => user.id) } },
        _count: { _all: true },
      }),
      prisma.user.findUnique({ where: { email: `demo.user@${EMAIL_DOMAIN}` }, select: { id: true } }),
    ]);
    if (seededUsers !== USER_COUNT || transactionsByUser.length !== USER_COUNT || transactionsByUser.some(({ _count }) => _count._all === 0)) {
      throw new Error("Demo data verification failed: every generated user must have at least one transaction.");
    }
    const demoUserTransactions = demoUser
      ? await prisma.transaction.count({ where: { userId: demoUser.id } })
      : 0;
    const transactionCounts = transactionsByUser.map(({ _count }) => _count._all);

    console.info(`Demo seed complete: ${seededUsers} demo users and ${seededTransactions} transactions.`);
    console.info(`Transactions per demo user: ${Math.min(...transactionCounts)}–${Math.max(...transactionCounts)}.`);
    console.info(`Login: demo.user@${EMAIL_DOMAIN} / ${DEMO_PASSWORD} (${demoUserTransactions} transactions)`);
    console.info("All demo accounts use the same password. This seed script is intended for local demonstrations only.");
  } finally {
    await prisma.$disconnect();
  }
}

void seedDemoData().catch((error: unknown) => {
  console.error("Demo seed failed:", error);
  process.exitCode = 1;
});
