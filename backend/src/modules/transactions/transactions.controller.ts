import type { Request, RequestHandler, Response } from "express";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from "./transactions.service";
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from "./transactions.validation";

interface ListTransactionsLocals {
  validatedQuery: ListTransactionsQuery;
}

function getAuthenticatedUserId(request: Pick<Request, "auth">, response: Response): string | undefined {
  const userId = request.auth?.userId;

  if (!userId) {
    response.status(401).json({ error: { message: "Authentication required" } });
  }

  return userId;
}

function respondToCategoryError(
  response: Response,
  kind: "invalid-category" | "type-mismatch",
): void {
  if (kind === "invalid-category") {
    response.status(400).json({ error: { message: "Category is invalid for this user" } });
    return;
  }

  response.status(400).json({ error: { message: "Category type must match transaction type" } });
}

export const list: RequestHandler<
  Record<string, never>,
  unknown,
  unknown,
  unknown,
  ListTransactionsLocals
> = async (request, response) => {
  const userId = getAuthenticatedUserId(request, response);
  if (!userId) return;

  const result = await listTransactions(userId, response.locals.validatedQuery);
  response.status(200).json({ data: result });
};

export const create: RequestHandler<Record<string, never>, unknown, CreateTransactionInput> = async (
  request,
  response,
) => {
  const userId = getAuthenticatedUserId(request, response);
  if (!userId) return;

  const result = await createTransaction(userId, request.body);

  if (result.kind === "invalid-category" || result.kind === "type-mismatch") {
    respondToCategoryError(response, result.kind);
    return;
  }

  response.status(201).json({ data: { transaction: result.transaction } });
};

export const get: RequestHandler<{ transactionId: string }> = async (request, response) => {
  const userId = getAuthenticatedUserId(request, response);
  if (!userId) return;

  const transaction = await getTransaction(userId, request.params.transactionId);

  if (!transaction) {
    response.status(404).json({ error: { message: "Transaction not found" } });
    return;
  }

  response.status(200).json({ data: { transaction } });
};

export const patch: RequestHandler<
  { transactionId: string },
  unknown,
  UpdateTransactionInput
> = async (request, response) => {
  const userId = getAuthenticatedUserId(request, response);
  if (!userId) return;

  const result = await updateTransaction(userId, request.params.transactionId, request.body);

  if (result.kind === "not-found") {
    response.status(404).json({ error: { message: "Transaction not found" } });
    return;
  }

  if (result.kind === "invalid-category" || result.kind === "type-mismatch") {
    respondToCategoryError(response, result.kind);
    return;
  }

  response.status(200).json({ data: { transaction: result.transaction } });
};

export const remove: RequestHandler<{ transactionId: string }> = async (request, response) => {
  const userId = getAuthenticatedUserId(request, response);
  if (!userId) return;

  const deleted = await deleteTransaction(userId, request.params.transactionId);

  if (!deleted) {
    response.status(404).json({ error: { message: "Transaction not found" } });
    return;
  }

  response.status(204).send();
};
