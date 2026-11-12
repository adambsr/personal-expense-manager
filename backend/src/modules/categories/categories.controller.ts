import type { Request, RequestHandler, Response } from "express";
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from "./categories.service";
import type { CreateCategoryInput, UpdateCategoryInput } from "./categories.validation";

function getAuthenticatedUserId(request: Request, response: Response): string | undefined {
  const userId = request.auth?.userId;

  if (!userId) {
    response.status(401).json({ error: { message: "Authentication required" } });
  }

  return userId;
}

export const list: RequestHandler = async (request, response) => {
  const userId = getAuthenticatedUserId(request, response);
  if (!userId) return;

  const categories = await listCategories(userId);
  response.status(200).json({ data: { categories } });
};

export const create: RequestHandler<Record<string, never>, unknown, CreateCategoryInput> = async (
  request,
  response,
) => {
  const userId = getAuthenticatedUserId(request, response);
  if (!userId) return;

  const result = await createCategory(userId, request.body);

  if (result.kind === "duplicate") {
    response.status(409).json({ error: { message: "A category with this name and type already exists" } });
    return;
  }

  response.status(201).json({ data: { category: result.category } });
};

export const get: RequestHandler<{ categoryId: string }> = async (request, response) => {
  const userId = getAuthenticatedUserId(request, response);
  if (!userId) return;

  const category = await getCategory(userId, request.params.categoryId);

  if (!category) {
    response.status(404).json({ error: { message: "Category not found" } });
    return;
  }

  response.status(200).json({ data: { category } });
};

export const patch: RequestHandler<
  { categoryId: string },
  unknown,
  UpdateCategoryInput
> = async (request, response) => {
  const userId = getAuthenticatedUserId(request, response);
  if (!userId) return;

  const result = await updateCategory(userId, request.params.categoryId, request.body);

  if (result.kind === "not-found") {
    response.status(404).json({ error: { message: "Category not found" } });
    return;
  }

  if (result.kind === "duplicate") {
    response.status(409).json({ error: { message: "A category with this name and type already exists" } });
    return;
  }

  response.status(200).json({ data: { category: result.category } });
};

export const remove: RequestHandler<{ categoryId: string }> = async (request, response) => {
  const userId = getAuthenticatedUserId(request, response);
  if (!userId) return;

  const result = await deleteCategory(userId, request.params.categoryId);

  if (result === "not-found") {
    response.status(404).json({ error: { message: "Category not found" } });
    return;
  }

  if (result === "in-use") {
    response.status(409).json({
      error: { message: "Category cannot be deleted while transactions reference it" },
    });
    return;
  }

  response.status(204).send();
};
