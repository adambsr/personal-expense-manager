import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../src/generated/prisma/client";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  category: {
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  transaction: {
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import app from "../src/app";

const testSecret = "vitest-only-secret-with-at-least-thirty-two-characters-123456";
const issuer = "personal-expense-manager-api";
const audience = "personal-expense-manager-client";
const userAId = "5a894bd5-0e8b-4fb3-a21d-267e40811d34";
const userBId = "e0683cfe-43a2-4fa3-a0ba-fd14d14dd147";
const testEmail = "member@example.com";
const testPassword = "correct-horse-battery";
const categoryAId = "938a50c2-6891-43c6-b04e-f83c51cd1af5";
const transactionAId = "54bc581d-cacf-49a5-8230-77436ed7bafb";

let baseUrl: string;
let server: ReturnType<typeof app.listen>;
let testPasswordHash: string;

beforeAll(async () => {
  testPasswordHash = await argon2.hash(testPassword, { type: argon2.argon2id });
});

beforeEach(async () => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
  prismaMock.$queryRaw.mockResolvedValue([]);
  prismaMock.category.createMany.mockResolvedValue({ count: 19 });
  prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { amount: null }, _count: { _all: 0 } });
  server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not bind to a TCP port");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

interface ApiOptions {
  method?: string;
  token?: string;
  body?: unknown;
}

function request(path: string, options: ApiOptions = {}) {
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (options.token) {
    headers.set("authorization", `Bearer ${options.token}`);
  }

  return fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

function accessToken(userId = userAId, expiresIn: number | string = 900): string {
  return jwt.sign({}, testSecret, {
    subject: userId,
    issuer,
    audience,
    expiresIn,
  });
}

function safeUser(userId = userAId) {
  return {
    id: userId,
    email: testEmail,
    firstName: "Ada",
    lastName: "Member",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    avatarUpdatedAt: null,
  };
}

function transactionRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: transactionAId,
    categoryId: categoryAId,
    amount: { toFixed: () => "12.30" },
    description: "Lunch",
    occurredAt: new Date("2026-03-15T12:00:00.000Z"),
    recurrenceFrequency: null,
    nextOccurrenceAt: null,
    createdAt: new Date("2026-03-15T12:00:00.000Z"),
    updatedAt: new Date("2026-03-15T12:00:00.000Z"),
    category: { type: "EXPENSE" },
    ...overrides,
  };
}

function dashboardTransaction(
  id: string,
  categoryId: string,
  categoryName: string,
  type: "INCOME" | "EXPENSE",
  amount: string,
  occurredAt: string,
) {
  return transactionRecord({
    id,
    categoryId,
    category: { name: categoryName, type },
    amount: new Prisma.Decimal(amount),
    occurredAt: new Date(occurredAt),
  });
}

describe("authentication API", () => {
  it("registers a user with an Argon2id hash and returns only safe profile fields", async () => {
    prismaMock.user.create.mockResolvedValue(safeUser());

    const response = await request("/api/auth/register", {
      method: "POST",
      body: { email: " MEMBER@EXAMPLE.COM ", password: testPassword },
    });
    const body = await response.json();
    const createCall = prismaMock.user.create.mock.calls[0]?.[0] as
      | { data: { email: string; passwordHash: string } }
      | undefined;

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ data: { user: { id: userAId, email: testEmail } } });
    expect(body).not.toHaveProperty("data.user.passwordHash");
    expect(createCall?.data.email).toBe(testEmail);
    expect(createCall?.data.passwordHash).not.toBe(testPassword);
    expect(await argon2.verify(createCall?.data.passwordHash ?? "", testPassword)).toBe(true);
  });

  it("rejects duplicate registrations with a conflict response", async () => {
    prismaMock.user.create.mockRejectedValue({ code: "P2002" });

    const response = await request("/api/auth/register", {
      method: "POST",
      body: { email: testEmail, password: testPassword },
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { message: expect.stringContaining("already exists") } });
  });

  it("validates registration input without returning submitted values", async () => {
    const response = await request("/api/auth/register", {
      method: "POST",
      body: { email: "not-an-email", password: "short" },
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: { message: "Validation failed" } });
    expect(JSON.stringify(body)).not.toContain("short");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("logs in and returns a short-lived bearer token without exposing the hash", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...safeUser(),
      passwordHash: testPasswordHash,
    });

    const response = await request("/api/auth/login", {
      method: "POST",
      body: { email: testEmail, password: testPassword },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: {
        tokenType: "Bearer",
        expiresIn: 900,
        user: { id: userAId, email: testEmail },
      },
    });
    expect(body).not.toHaveProperty("data.user.passwordHash");

    const token = (body as { data: { accessToken: string } }).data.accessToken;
    expect(jwt.verify(token, testSecret, { issuer, audience })).toMatchObject({ sub: userAId });
  });

  it("uses the same unauthorized response for an unknown account and wrong password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await request("/api/auth/login", {
      method: "POST",
      body: { email: testEmail, password: testPassword },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { message: "Invalid email or password" } });
  });

  it("rejects a wrong password", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...safeUser(),
      passwordHash: testPasswordHash,
    });

    const response = await request("/api/auth/login", {
      method: "POST",
      body: { email: testEmail, password: "incorrect-password" },
    });

    expect(response.status).toBe(401);
  });

  it("requires a valid token for the safe profile endpoint", async () => {
    const response = await request("/api/auth/me");

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { message: "Authentication required" } });
  });

  it.each(["not-a-token", accessToken(userAId, -1)])("rejects an invalid or expired JWT", async (token) => {
    const response = await request("/api/auth/me", { token });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { message: "Invalid or expired access token" } });
  });

  it("returns the authenticated user's safe profile", async () => {
    prismaMock.user.findUnique.mockResolvedValue(safeUser());

    const response = await request("/api/auth/me", { token: accessToken() });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ data: { user: { id: userAId, email: testEmail } } });
    expect(body).not.toHaveProperty("data.user.passwordHash");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: userAId }, select: expect.not.objectContaining({ passwordHash: true }) }),
    );
  });

  it("updates only the authenticated user's validated profile fields", async () => {
    prismaMock.user.update.mockResolvedValue({ ...safeUser(), firstName: "Ada", lastName: "Lovelace" });
    const response = await request("/api/auth/me", {
      method: "PUT",
      token: accessToken(userAId),
      body: { firstName: " Ada ", lastName: "Lovelace" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user).toMatchObject({ firstName: "Ada", lastName: "Lovelace", email: testEmail });
    expect(body.data.user).not.toHaveProperty("passwordHash");
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: userAId },
      data: { firstName: "Ada", lastName: "Lovelace" },
      select: expect.not.objectContaining({ passwordHash: true, avatarData: true }),
    }));
  });

  it("validates profile updates and requires authentication", async () => {
    const unauthorized = await request("/api/auth/me", {
      method: "PUT",
      body: { firstName: "Ada", lastName: "Lovelace" },
    });
    const invalid = await request("/api/auth/me", {
      method: "PUT",
      token: accessToken(),
      body: { firstName: "  ", lastName: "Lovelace", email: "other@example.com" },
    });

    expect(unauthorized.status).toBe(401);
    expect(invalid.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("stores signature-validated avatars for the authenticated user", async () => {
    const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1]);
    prismaMock.user.update.mockResolvedValue({});
    const response = await fetch(`${baseUrl}/api/auth/me/avatar`, {
      method: "PUT",
      headers: { authorization: `Bearer ${accessToken(userAId)}`, "content-type": "image/png" },
      body: image,
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.avatarUpdatedAt).toBeTruthy();
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: userAId },
      data: expect.objectContaining({ avatarData: Uint8Array.from(image), avatarMimeType: "image/png" }),
    }));
  });

  it("rejects avatar content that does not match its declared image type", async () => {
    const response = await fetch(`${baseUrl}/api/auth/me/avatar`, {
      method: "PUT",
      headers: { authorization: `Bearer ${accessToken(userAId)}`, "content-type": "image/png" },
      body: Buffer.from("not an image"),
    });

    expect(response.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("serves only the authenticated user's stored image bytes", async () => {
    const image = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
    prismaMock.user.findUnique.mockResolvedValue({ avatarData: image, avatarMimeType: "image/png" });
    const response = await request("/api/auth/me/avatar", { token: accessToken(userAId) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from(image));
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: userAId },
      select: { avatarData: true, avatarMimeType: true },
    });
  });

  it("removes only the authenticated user's avatar and returns a safe profile", async () => {
    prismaMock.user.update.mockResolvedValue(safeUser());

    const response = await request("/api/auth/me/avatar", {
      method: "DELETE",
      token: accessToken(userAId),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user).toMatchObject({ id: userAId, avatarUpdatedAt: null });
    expect(body.data.user).not.toHaveProperty("passwordHash");
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: userAId },
      data: { avatarData: null, avatarMimeType: null, avatarUpdatedAt: null },
      select: expect.not.objectContaining({ passwordHash: true, avatarData: true }),
    }));
  });
});

describe("categories API", () => {
  it("creates a category for the token owner and ignores no client-supplied user IDs", async () => {
    const category = {
      id: "938a50c2-6891-43c6-b04e-f83c51cd1af5",
      name: "Salary",
      type: "INCOME",
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };
    prismaMock.category.create.mockResolvedValue(category);

    const response = await request("/api/categories", {
      method: "POST",
      token: accessToken(userAId),
      body: { name: " Salary ", type: "INCOME" },
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ data: { category: { name: "Salary", type: "INCOME" } } });
    expect(prismaMock.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "Salary", type: "INCOME", userId: userAId } }),
    );
  });

  it("rejects a client-supplied owner ID", async () => {
    const response = await request("/api/categories", {
      method: "POST",
      token: accessToken(userAId),
      body: { name: "Food", type: "EXPENSE", userId: userBId },
    });

    expect(response.status).toBe(400);
    expect(prismaMock.category.create).not.toHaveBeenCalled();
  });

  it("validates category types", async () => {
    const response = await request("/api/categories", {
      method: "POST",
      token: accessToken(userAId),
      body: { name: "Other", type: "TRANSFER" },
    });

    expect(response.status).toBe(400);
    expect(prismaMock.category.create).not.toHaveBeenCalled();
  });

  it("lists only categories owned by the authenticated user", async () => {
    prismaMock.category.findMany.mockResolvedValue([]);

    const response = await request("/api/categories", { token: accessToken(userAId) });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { categories: [] } });
    expect(prismaMock.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: userAId } }),
    );
  });

  it("returns not found when another user's category is requested", async () => {
    const categoryId = "938a50c2-6891-43c6-b04e-f83c51cd1af5";
    prismaMock.category.findFirst.mockResolvedValue(null);

    const response = await request(`/api/categories/${categoryId}`, { token: accessToken(userAId) });

    expect(response.status).toBe(404);
    expect(prismaMock.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: categoryId, userId: userAId } }),
    );
  });

  it("does not update a category owned by another user", async () => {
    const categoryId = "938a50c2-6891-43c6-b04e-f83c51cd1af5";
    prismaMock.category.update.mockRejectedValue({ code: "P2025" });

    const response = await request(`/api/categories/${categoryId}`, {
      method: "PATCH",
      token: accessToken(userAId),
      body: { name: "Changed" },
    });

    expect(response.status).toBe(404);
    expect(prismaMock.category.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_userId: { id: categoryId, userId: userAId } } }),
    );
  });

  it("updates an owned category", async () => {
    const categoryId = "938a50c2-6891-43c6-b04e-f83c51cd1af5";
    const updatedCategory = {
      id: categoryId,
      name: "Groceries",
      type: "EXPENSE",
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      updatedAt: new Date("2026-01-03T00:00:00.000Z"),
    };
    prismaMock.category.update.mockResolvedValue(updatedCategory);

    const response = await request(`/api/categories/${categoryId}`, {
      method: "PATCH",
      token: accessToken(userAId),
      body: { name: "Groceries" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { category: { name: "Groceries" } } });
    expect(prismaMock.category.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_userId: { id: categoryId, userId: userAId } } }),
    );
  });

  it("does not delete a category owned by another user", async () => {
    const categoryId = "938a50c2-6891-43c6-b04e-f83c51cd1af5";
    prismaMock.category.deleteMany.mockResolvedValue({ count: 0 });

    const response = await request(`/api/categories/${categoryId}`, {
      method: "DELETE",
      token: accessToken(userAId),
    });

    expect(response.status).toBe(404);
    expect(prismaMock.category.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: categoryId, userId: userAId } }),
    );
  });

  it("deletes an owned category with no transactions", async () => {
    const categoryId = "938a50c2-6891-43c6-b04e-f83c51cd1af5";
    prismaMock.category.deleteMany.mockResolvedValue({ count: 1 });

    const response = await request(`/api/categories/${categoryId}`, {
      method: "DELETE",
      token: accessToken(userAId),
    });

    expect(response.status).toBe(204);
    expect(prismaMock.category.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: categoryId, userId: userAId } }),
    );
  });

  it("validates category route parameters", async () => {
    const response = await request("/api/categories/not-a-uuid", { token: accessToken(userAId) });

    expect(response.status).toBe(400);
    expect(prismaMock.category.findFirst).not.toHaveBeenCalled();
  });

  it("reports duplicate category name/type conflicts", async () => {
    prismaMock.category.create.mockRejectedValue({ code: "P2002" });

    const response = await request("/api/categories", {
      method: "POST",
      token: accessToken(userAId),
      body: { name: "Food", type: "EXPENSE" },
    });

    expect(response.status).toBe(409);
  });

  it("prevents deleting categories referenced by transactions", async () => {
    prismaMock.category.deleteMany.mockRejectedValue({ code: "P2003" });

    const response = await request("/api/categories/938a50c2-6891-43c6-b04e-f83c51cd1af5", {
      method: "DELETE",
      token: accessToken(userAId),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { message: "Category cannot be deleted while transactions reference it" },
    });
  });

  it("rejects category requests without a valid token", async () => {
    const response = await request("/api/categories");

    expect(response.status).toBe(401);
  });
});

describe("transactions API", () => {
  it("creates a transaction with an exact decimal amount and retrieves it", async () => {
    const occurredAt = "2026-03-15T12:00:00.000Z";
    prismaMock.category.findFirst.mockResolvedValue({ id: categoryAId, type: "EXPENSE" });
    prismaMock.transaction.create.mockResolvedValue(transactionRecord());

    const created = await request("/api/transactions", {
      method: "POST",
      token: accessToken(userAId),
      body: { categoryId: categoryAId, type: "EXPENSE", amount: "12.30", occurredAt },
    });
    const createdBody = await created.json();

    expect(created.status).toBe(201);
    expect(createdBody).toMatchObject({
      data: { transaction: { id: transactionAId, categoryId: categoryAId, type: "EXPENSE", amount: "12.30" } },
    });
    expect(prismaMock.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: userAId, categoryId: categoryAId, occurredAt: new Date(occurredAt) }),
      }),
    );
    const createCall = prismaMock.transaction.create.mock.calls[0]?.[0] as
      | { data: { amount: { toFixed: (scale: number) => string } } }
      | undefined;
    expect(createCall?.data.amount.toFixed(2)).toBe("12.30");

    prismaMock.transaction.findFirst.mockResolvedValue(transactionRecord());
    const retrieved = await request(`/api/transactions/${transactionAId}`, {
      token: accessToken(userAId),
    });

    expect(retrieved.status).toBe(200);
    expect(await retrieved.json()).toMatchObject({
      data: { transaction: { id: transactionAId, amount: "12.30", type: "EXPENSE" } },
    });
    expect(prismaMock.transaction.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: transactionAId, userId: userAId } }),
    );
  });

  it.each([
    { frequency: "WEEKLY", occurredAt: "2026-03-15T12:00:00.000Z", next: "2026-03-22T12:00:00.000Z" },
    { frequency: "MONTHLY", occurredAt: "2026-01-31T12:00:00.000Z", next: "2026-02-28T12:00:00.000Z" },
    { frequency: "YEARLY", occurredAt: "2024-02-29T12:00:00.000Z", next: "2025-02-28T12:00:00.000Z" },
  ] as const)("stores a $frequency schedule without creating future transactions", async ({ frequency, occurredAt, next }) => {
    prismaMock.category.findFirst.mockResolvedValue({ id: categoryAId, type: "EXPENSE" });
    prismaMock.transaction.create.mockResolvedValue(transactionRecord({
      occurredAt: new Date(occurredAt), recurrenceFrequency: frequency, nextOccurrenceAt: new Date(next),
    }));

    const response = await request("/api/transactions", {
      method: "POST",
      token: accessToken(userAId),
      body: { categoryId: categoryAId, type: "EXPENSE", amount: "12.30", occurredAt, recurrenceFrequency: frequency },
    });

    expect(response.status).toBe(201);
    expect((await response.json()).data.transaction).toMatchObject({ recurrenceFrequency: frequency, nextOccurrenceAt: next });
    expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.transaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ recurrenceFrequency: frequency, nextOccurrenceAt: new Date(next) }),
    }));
  });

  it("clears recurrence metadata when a recurring transaction is made one-time", async () => {
    prismaMock.transaction.findFirst.mockResolvedValue({
      id: transactionAId, categoryId: categoryAId, occurredAt: new Date("2026-03-15T12:00:00.000Z"),
      recurrenceFrequency: "MONTHLY", nextOccurrenceAt: new Date("2026-04-15T12:00:00.000Z"),
      category: { type: "EXPENSE" },
    });
    prismaMock.category.findFirst.mockResolvedValue({ id: categoryAId, type: "EXPENSE" });
    prismaMock.transaction.update.mockResolvedValue(transactionRecord());

    const response = await request(`/api/transactions/${transactionAId}`, {
      method: "PATCH", token: accessToken(userAId), body: { recurrenceFrequency: null },
    });

    expect(response.status).toBe(200);
    expect(prismaMock.transaction.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ recurrenceFrequency: null, nextOccurrenceAt: null }),
    }));
  });

  it("rejects unsupported recurrence frequencies", async () => {
    const response = await request("/api/transactions", {
      method: "POST", token: accessToken(userAId),
      body: { categoryId: categoryAId, type: "EXPENSE", amount: "5.00", occurredAt: "2026-03-15T12:00:00.000Z", recurrenceFrequency: "DAILY" },
    });

    expect(response.status).toBe(400);
    expect(prismaMock.category.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it("lists matching transactions with deterministic pagination", async () => {
    prismaMock.transaction.findMany.mockResolvedValue([transactionRecord()]);
    prismaMock.transaction.count.mockResolvedValue(41);

    const response = await request(
      "/api/transactions?categoryId=" +
        categoryAId +
        "&type=EXPENSE&startDate=2026-03-01T00%3A00%3A00Z&endDate=2026-03-31T23%3A59%3A59Z&page=2&limit=10",
      { token: accessToken(userAId) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: {
        transactions: [{ id: transactionAId, amount: "12.30" }],
        pagination: { page: 2, limit: 10, total: 41, totalPages: 5 },
      },
    });

    const expectedWhere = {
      userId: userAId,
      categoryId: categoryAId,
      category: { type: "EXPENSE" },
      occurredAt: {
        gte: new Date("2026-03-01T00:00:00Z"),
        lte: new Date("2026-03-31T23:59:59Z"),
      },
    };
    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        skip: 10,
        take: 10,
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      }),
    );
    expect(prismaMock.transaction.count).toHaveBeenCalledWith({ where: expectedWhere });
  });

  it("searches descriptions while returning exact user-wide summaries", async () => {
    prismaMock.transaction.findMany.mockResolvedValue([transactionRecord()]);
    prismaMock.transaction.count.mockResolvedValue(1);
    prismaMock.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("1250.45") }, _count: { _all: 2 } })
      .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("23.10") }, _count: { _all: 1 } });

    const response = await request("/api/transactions?search=lunch&sort=AMOUNT_DESC", { token: accessToken(userAId) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.summary).toEqual({
      activity: { total: "1273.55", count: 3 },
      income: { total: "1250.45", count: 2 },
      expenses: { total: "23.10", count: 1 },
    });
    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: userAId, description: { contains: "lunch", mode: "insensitive" } },
      orderBy: [{ amount: "desc" }, { occurredAt: "desc" }, { id: "desc" }],
    }));
    expect(prismaMock.transaction.aggregate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { userId: userAId, category: { type: "INCOME" } },
      _sum: { amount: true },
      _count: { _all: true },
    }));
    expect(prismaMock.transaction.aggregate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { userId: userAId, category: { type: "EXPENSE" } },
    }));
  });

  it("keeps income and expense summary totals unchanged across every transaction list filter", async () => {
    const filterQueries = [
      "",
      "?type=INCOME",
      "?type=EXPENSE",
      "?search=groceries",
      `?categoryId=${categoryAId}`,
      "?startDate=2026-03-01T00%3A00%3A00Z&endDate=2026-03-31T23%3A59%3A59Z",
      "?sort=AMOUNT_ASC",
      "?page=2&limit=1",
      `?type=EXPENSE&categoryId=${categoryAId}&search=groceries&startDate=2026-03-01T00%3A00%3A00Z&endDate=2026-03-31T23%3A59%3A59Z&sort=AMOUNT_DESC&page=2&limit=5`,
    ];
    const expectedSummary = {
      activity: { total: "105.40", count: 5 },
      income: { total: "80.10", count: 2 },
      expenses: { total: "25.30", count: 3 },
    };
    const returnedSummaries = [];

    prismaMock.transaction.findMany.mockResolvedValue([]);
    prismaMock.transaction.count.mockResolvedValue(0);

    for (const query of filterQueries) {
      prismaMock.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("80.10") }, _count: { _all: 2 } })
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("25.30") }, _count: { _all: 3 } });

      const response = await request(`/api/transactions${query}`, { token: accessToken(userAId) });

      expect(response.status).toBe(200);
      const body = await response.json();
      returnedSummaries.push(body.data.summary);
    }

    expect(returnedSummaries).toHaveLength(filterQueries.length);
    expect(returnedSummaries).toEqual(filterQueries.map(() => expectedSummary));
    expect(prismaMock.transaction.aggregate).toHaveBeenCalledTimes(filterQueries.length * 2);

    for (let index = 0; index < filterQueries.length; index += 1) {
      expect(prismaMock.transaction.aggregate).toHaveBeenNthCalledWith(index * 2 + 1, expect.objectContaining({
        where: { userId: userAId, category: { type: "INCOME" } },
      }));
      expect(prismaMock.transaction.aggregate).toHaveBeenNthCalledWith(index * 2 + 2, expect.objectContaining({
        where: { userId: userAId, category: { type: "EXPENSE" } },
      }));
    }
  });

  it.each(["INVALID", "x".repeat(121)])("rejects invalid search and sorting query values %s", async (value) => {
    const query = value === "INVALID" ? "sort=INVALID" : `search=${encodeURIComponent(value)}`;
    const response = await request(`/api/transactions?${query}`, { token: accessToken(userAId) });

    expect(response.status).toBe(400);
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled();
    expect(prismaMock.transaction.aggregate).not.toHaveBeenCalled();
  });

  it.each(["0", "-0.01", "1.001", "10000000000", 12.5])(
    "rejects invalid decimal amount %s before database access",
    async (amount) => {
      const response = await request("/api/transactions", {
        method: "POST",
        token: accessToken(userAId),
        body: {
          categoryId: categoryAId,
          type: "EXPENSE",
          amount,
          occurredAt: "2026-03-15T12:00:00.000Z",
        },
      });

      expect(response.status).toBe(400);
      expect(prismaMock.category.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.transaction.create).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid calendar dates", async () => {
    const response = await request("/api/transactions", {
      method: "POST",
      token: accessToken(userAId),
      body: {
        categoryId: categoryAId,
        type: "EXPENSE",
        amount: "5.00",
        occurredAt: "2026-02-30T12:00:00.000Z",
      },
    });

    expect(response.status).toBe(400);
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it("validates transaction route parameters", async () => {
    const response = await request("/api/transactions/not-a-uuid", {
      token: accessToken(userAId),
    });

    expect(response.status).toBe(400);
    expect(prismaMock.transaction.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a category that does not belong to the authenticated user", async () => {
    prismaMock.category.findFirst.mockResolvedValue(null);

    const response = await request("/api/transactions", {
      method: "POST",
      token: accessToken(userAId),
      body: {
        categoryId: categoryAId,
        type: "EXPENSE",
        amount: "5.00",
        occurredAt: "2026-03-15T12:00:00.000Z",
      },
    });

    expect(response.status).toBe(400);
    expect(prismaMock.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: categoryAId, userId: userAId } }),
    );
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it("rejects a client-supplied transaction owner ID", async () => {
    const response = await request("/api/transactions", {
      method: "POST",
      token: accessToken(userAId),
      body: {
        categoryId: categoryAId,
        type: "EXPENSE",
        amount: "5.00",
        occurredAt: "2026-03-15T12:00:00.000Z",
        userId: userBId,
      },
    });

    expect(response.status).toBe(400);
    expect(prismaMock.category.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it("rejects a transaction type that does not match its category", async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: categoryAId, type: "INCOME" });

    const response = await request("/api/transactions", {
      method: "POST",
      token: accessToken(userAId),
      body: {
        categoryId: categoryAId,
        type: "EXPENSE",
        amount: "5.00",
        occurredAt: "2026-03-15T12:00:00.000Z",
      },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { message: "Category type must match transaction type" },
    });
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it("returns not found when another user's transaction is requested or updated", async () => {
    prismaMock.transaction.findFirst.mockResolvedValue(null);

    const retrieved = await request(`/api/transactions/${transactionAId}`, {
      token: accessToken(userAId),
    });
    const updated = await request(`/api/transactions/${transactionAId}`, {
      method: "PATCH",
      token: accessToken(userAId),
      body: { amount: "15.00" },
    });

    expect(retrieved.status).toBe(404);
    expect(updated.status).toBe(404);
    expect(prismaMock.transaction.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: transactionAId, userId: userAId } }),
    );
    expect(prismaMock.transaction.update).not.toHaveBeenCalled();
  });

  it("updates an owned transaction using a decimal string", async () => {
    prismaMock.transaction.findFirst.mockResolvedValue({
      id: transactionAId,
      categoryId: categoryAId,
      category: { type: "EXPENSE" },
    });
    prismaMock.category.findFirst.mockResolvedValue({ id: categoryAId, type: "EXPENSE" });
    prismaMock.transaction.update.mockResolvedValue(
      transactionRecord({ amount: { toFixed: () => "15.75" }, description: "Dinner" }),
    );

    const response = await request(`/api/transactions/${transactionAId}`, {
      method: "PATCH",
      token: accessToken(userAId),
      body: { amount: "15.75", description: "Dinner" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { transaction: { amount: "15.75", description: "Dinner" } },
    });
    expect(prismaMock.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: transactionAId, userId: userAId } }),
    );
    const updateCall = prismaMock.transaction.update.mock.calls[0]?.[0] as
      | { data: { amount: { toFixed: (scale: number) => string } } }
      | undefined;
    expect(updateCall?.data.amount.toFixed(2)).toBe("15.75");
  });

  it("does not delete another user's transaction", async () => {
    prismaMock.transaction.deleteMany.mockResolvedValue({ count: 0 });

    const response = await request(`/api/transactions/${transactionAId}`, {
      method: "DELETE",
      token: accessToken(userAId),
    });

    expect(response.status).toBe(404);
    expect(prismaMock.transaction.deleteMany).toHaveBeenCalledWith({
      where: { id: transactionAId, userId: userAId },
    });
  });

  it("rejects requests without authentication and missing records", async () => {
    const unauthorized = await request("/api/transactions");
    expect(unauthorized.status).toBe(401);

    prismaMock.transaction.findFirst.mockResolvedValue(null);
    const missing = await request(`/api/transactions/${transactionAId}`, {
      token: accessToken(userAId),
    });
    expect(missing.status).toBe(404);
  });
});

describe("dashboard summary API", () => {
  it("returns zero totals and empty collections for an empty month", async () => {
    prismaMock.transaction.groupBy.mockResolvedValue([]);
    prismaMock.transaction.findMany.mockResolvedValue([]);

    const response = await request("/api/dashboard/summary?month=2&year=2025", {
      token: accessToken(userAId),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: {
        period: { month: 2, year: 2025 },
        totals: { income: "0.00", expenses: "0.00", balance: "0.00" },
        incomeByCategory: [],
        expensesByCategory: [],
        recentTransactions: [],
        cashFlow: {
          weekly: {
            periodStart: "2025-02-01",
            periodEnd: "2025-02-28",
            buckets: expect.arrayContaining([
              expect.objectContaining({ income: "0.00", expenses: "0.00" }),
            ]),
          },
          monthly: {
            periodStart: "2024-03-01",
            periodEnd: "2025-02-28",
            buckets: expect.arrayContaining([
              expect.objectContaining({ income: "0.00", expenses: "0.00" }),
            ]),
          },
        },
      },
    });
    expect(body.data.cashFlow.weekly.buckets).toHaveLength(5);
    expect(body.data.cashFlow.monthly.buckets).toHaveLength(12);
    expect(prismaMock.category.findMany).not.toHaveBeenCalled();
  });

  it("aggregates exact income, expenses, balance, category totals, and recent transactions", async () => {
    const salaryId = "eb08ba9a-5be2-4635-b865-267f4f98fd13";
    const giftId = "f7af2070-4040-42ab-8cbd-a57f9d3a310a";
    const foodId = "29ef45d2-2d12-4474-9c5f-290b9a1cbca6";
    prismaMock.transaction.groupBy.mockResolvedValue([
      { categoryId: foodId, _sum: { amount: new Prisma.Decimal("45.25") } },
      { categoryId: giftId, _sum: { amount: new Prisma.Decimal("10.10") } },
      { categoryId: salaryId, _sum: { amount: new Prisma.Decimal("1250.50") } },
    ]);
    prismaMock.category.findMany.mockResolvedValue([
      { id: salaryId, name: "Salary", type: "INCOME" },
      { id: giftId, name: "Gift", type: "INCOME" },
      { id: foodId, name: "Food", type: "EXPENSE" },
    ]);
    prismaMock.transaction.findMany.mockResolvedValue([
      dashboardTransaction(
        "a239b7f4-838c-4117-83bf-7e7e14a69c45",
        foodId,
        "Food",
        "EXPENSE",
        "45.25",
        "2025-04-29T10:00:00.000Z",
      ),
      dashboardTransaction(
        "3d58d98d-681a-4cf6-a75f-434f4504b86e",
        salaryId,
        "Salary",
        "INCOME",
        "1250.50",
        "2025-04-01T10:00:00.000Z",
      ),
    ]);

    const response = await request("/api/dashboard/summary?month=4&year=2025", {
      token: accessToken(userAId),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: {
        period: { month: 4, year: 2025 },
        totals: { income: "1260.60", expenses: "45.25", balance: "1215.35" },
        incomeByCategory: [
          { categoryId: salaryId, categoryName: "Salary", total: "1250.50" },
          { categoryId: giftId, categoryName: "Gift", total: "10.10" },
        ],
        expensesByCategory: [{ categoryId: foodId, categoryName: "Food", total: "45.25" }],
        recentTransactions: [
          { categoryName: "Food", type: "EXPENSE", amount: "45.25" },
          { categoryName: "Salary", type: "INCOME", amount: "1250.50" },
        ],
      },
    });

    const expectedWhere = {
      userId: userAId,
      occurredAt: {
        gte: new Date("2025-04-01T00:00:00.000Z"),
        lt: new Date("2025-05-01T00:00:00.000Z"),
      },
    };
    expect(prismaMock.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere, by: ["categoryId"], _sum: { amount: true } }),
    );
    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        take: 5,
      }),
    );
    expect(prismaMock.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: userAId, id: { in: [foodId, giftId, salaryId] } } }),
    );
  });

  it("returns Decimal-safe weekly and trailing twelve-month cash flow buckets", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { granularity: "weekly", periodStart: "2025-03-31", type: "INCOME", total: new Prisma.Decimal("0.30") },
      { granularity: "weekly", periodStart: "2025-03-31", type: "EXPENSE", total: new Prisma.Decimal("12.45") },
      { granularity: "weekly", periodStart: "2025-04-28", type: "INCOME", total: new Prisma.Decimal("1250.50") },
      { granularity: "monthly", periodStart: "2024-05", type: "EXPENSE", total: new Prisma.Decimal("0.10") },
      { granularity: "monthly", periodStart: "2025-04", type: "INCOME", total: new Prisma.Decimal("1250.80") },
    ]);

    const response = await request("/api/dashboard/summary?month=4&year=2025", {
      token: accessToken(userAId),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.cashFlow.weekly).toMatchObject({
      periodStart: "2025-04-01",
      periodEnd: "2025-04-30",
      buckets: expect.arrayContaining([
        { periodStart: "2025-04-01", periodEnd: "2025-04-06", income: "0.30", expenses: "12.45" },
        { periodStart: "2025-04-28", periodEnd: "2025-04-30", income: "1250.50", expenses: "0.00" },
      ]),
    });
    expect(body.data.cashFlow.weekly.buckets).toHaveLength(5);
    expect(body.data.cashFlow.monthly).toMatchObject({
      periodStart: "2024-05-01",
      periodEnd: "2025-04-30",
      buckets: expect.arrayContaining([
        { periodStart: "2024-05-01", periodEnd: "2024-05-31", income: "0.00", expenses: "0.10" },
        { periodStart: "2025-04-01", periodEnd: "2025-04-30", income: "1250.80", expenses: "0.00" },
      ]),
    });
    expect(body.data.cashFlow.monthly.buckets).toHaveLength(12);

    const chartQuery = prismaMock.$queryRaw.mock.calls[0]?.[0] as { sql: string; values: unknown[] };
    expect(chartQuery.sql).toContain("SUM(\"amount\")");
    expect(chartQuery.sql).toContain("date_trunc('week'");
    expect(chartQuery.sql).toContain("date_trunc('month'");
    expect(chartQuery.values).toContain(userAId);
    expect(chartQuery.values).toContainEqual(new Date("2024-05-01T00:00:00.000Z"));
    expect(chartQuery.values).toContainEqual(new Date("2025-04-01T00:00:00.000Z"));
    expect(chartQuery.values).toContainEqual(new Date("2025-05-01T00:00:00.000Z"));
  });

  it("validates month and year query parameters before database access", async () => {
    const invalidMonth = await request("/api/dashboard/summary?month=13&year=2025", {
      token: accessToken(userAId),
    });
    const invalidYear = await request("/api/dashboard/summary?month=4&year=2025.5", {
      token: accessToken(userAId),
    });

    expect(invalidMonth.status).toBe(400);
    expect(invalidYear.status).toBe(400);
    expect(prismaMock.transaction.groupBy).not.toHaveBeenCalled();
  });

  it("requires authentication and scopes summary queries to the JWT user", async () => {
    const unauthorized = await request("/api/dashboard/summary?month=4&year=2025");
    expect(unauthorized.status).toBe(401);

    prismaMock.transaction.groupBy.mockResolvedValue([]);
    prismaMock.transaction.findMany.mockResolvedValue([]);
    const response = await request("/api/dashboard/summary?month=4&year=2025", {
      token: accessToken(userBId),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: userBId }) }),
    );
    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: userBId }) }),
    );
    const chartQuery = prismaMock.$queryRaw.mock.calls[0]?.[0] as { values: unknown[] };
    expect(chartQuery.values).toContain(userBId);
  });
});
