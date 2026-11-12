import { prisma } from "../../lib/prisma";
import { isPrismaErrorCode } from "../../utils/prisma-errors";
import type { CreateCategoryInput, UpdateCategoryInput } from "./categories.validation";

const categorySelect = {
  id: true,
  name: true,
  type: true,
  createdAt: true,
  updatedAt: true,
};

export function listCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    select: categorySelect,
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export async function createCategory(userId: string, input: CreateCategoryInput) {
  try {
    const category = await prisma.category.create({
      data: { ...input, userId },
      select: categorySelect,
    });

    return { kind: "created" as const, category };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return { kind: "duplicate" as const };
    }

    throw error;
  }
}

export function getCategory(userId: string, categoryId: string) {
  return prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: categorySelect,
  });
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: UpdateCategoryInput,
) {
  try {
    const category = await prisma.category.update({
      where: { id_userId: { id: categoryId, userId } },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.type === undefined ? {} : { type: input.type }),
      },
      select: categorySelect,
    });

    return { kind: "updated" as const, category };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2025")) {
      return { kind: "not-found" as const };
    }

    if (isPrismaErrorCode(error, "P2002")) {
      return { kind: "duplicate" as const };
    }

    throw error;
  }
}

export async function deleteCategory(userId: string, categoryId: string) {
  try {
    const result = await prisma.category.deleteMany({
      where: { id: categoryId, userId },
    });

    return result.count > 0 ? "deleted" : "not-found";
  } catch (error) {
    if (isPrismaErrorCode(error, "P2003")) {
      return "in-use";
    }

    throw error;
  }
}
