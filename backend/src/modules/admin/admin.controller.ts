import type { RequestHandler } from "express";
import {
  categoryIdParamsSchema, createAdminUserSchema, createGlobalCategorySchema,
  listCategoriesQuerySchema, listUsersQuerySchema, updateAdminUserSchema,
  updateGlobalCategorySchema, userIdParamsSchema,
} from "./admin.validation";
import { createGlobalCategory, createUser, getOverview, getUserDetails, listGlobalCategories, listUsers, updateGlobalCategory, updateUser } from "./admin.service";

export const overview: RequestHandler = async (_request, response) => {
  response.status(200).json({ data: await getOverview() });
};

export const users: RequestHandler = async (request, response) => {
  const query = listUsersQuerySchema.parse(request.query);
  response.status(200).json({ data: await listUsers(query) });
};

export const userDetails: RequestHandler = async (request, response) => {
  const { userId } = userIdParamsSchema.parse(request.params);
  const data = await getUserDetails(userId);
  if (!data) {
    response.status(404).json({ error: { message: "User not found" } });
    return;
  }
  response.status(200).json({ data });
};

export const createAdminUser: RequestHandler = async (request, response) => {
  const actorUserId = request.auth?.userId;
  if (!actorUserId) {
    response.status(401).json({ error: { message: "Authentication required" } });
    return;
  }
  const input = createAdminUserSchema.parse(request.body);
  const result = await createUser(input, actorUserId);
  if (result.kind === "duplicate") {
    response.status(409).json({ error: { message: "An account with this email already exists" } });
    return;
  }
  response.status(201).json({ data: result });
};

export const updateAdminUser: RequestHandler = async (request, response) => {
  const { userId } = userIdParamsSchema.parse(request.params);
  const actorId = request.auth?.userId;
  if (!actorId) {
    response.status(401).json({ error: { message: "Authentication required" } });
    return;
  }
  const result = await updateUser(userId, actorId, updateAdminUserSchema.parse(request.body));
  if (result.kind === "not-found") {
    response.status(404).json({ error: { message: "User not found" } });
    return;
  }
  if (result.kind === "self-protected" || result.kind === "last-admin") {
    response.status(409).json({ error: { message: result.kind === "last-admin" ? "The last active administrator cannot be demoted" : "You cannot deactivate or demote your own account" } });
    return;
  }
  response.status(200).json({ data: result });
};

export const categories: RequestHandler = async (request, response) => {
  const query = listCategoriesQuerySchema.parse(request.query);
  response.status(200).json({ data: await listGlobalCategories(query) });
};

export const createCategory: RequestHandler = async (request, response) => {
  const actorUserId = request.auth?.userId;
  if (!actorUserId) {
    response.status(401).json({ error: { message: "Authentication required" } });
    return;
  }
  const result = await createGlobalCategory(createGlobalCategorySchema.parse(request.body), actorUserId);
  if (result.kind === "duplicate") {
    response.status(409).json({ error: { message: "A global category with this type and name already exists" } });
    return;
  }
  response.status(201).json({ data: result });
};

export const updateCategory: RequestHandler = async (request, response) => {
  const actorUserId = request.auth?.userId;
  if (!actorUserId) {
    response.status(401).json({ error: { message: "Authentication required" } });
    return;
  }
  const { categoryId } = categoryIdParamsSchema.parse(request.params);
  const result = await updateGlobalCategory(categoryId, actorUserId, updateGlobalCategorySchema.parse(request.body));
  if (result.kind === "not-found") {
    response.status(404).json({ error: { message: "Global category not found" } });
    return;
  }
  if (result.kind === "duplicate") {
    response.status(409).json({ error: { message: "A global category with this type and name already exists" } });
    return;
  }
  response.status(200).json({ data: result });
};
