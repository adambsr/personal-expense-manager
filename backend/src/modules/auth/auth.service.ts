import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { authConfig } from "../../config/auth";
import { prisma } from "../../lib/prisma";
import { ensureDefaultCategories } from "../categories/default-categories";
import { isPrismaErrorCode } from "../../utils/prisma-errors";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "./auth.validation";

const safeUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  createdAt: true,
  avatarUpdatedAt: true,
};

const avatarSelect = {
  avatarData: true,
  avatarMimeType: true,
};

const userForLoginSelect = {
  ...safeUserSelect,
  passwordHash: true,
};

export async function registerUser(input: RegisterInput) {
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
  });

  try {
    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: { email: input.email, passwordHash },
        select: safeUserSelect,
      });
      await ensureDefaultCategories(transaction, createdUser.id);
      return createdUser;
    });

    return { kind: "created" as const, user };
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return { kind: "duplicate" as const };
    }

    throw error;
  }
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: userForLoginSelect,
  });

  if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
    return null;
  }

  await prisma.$transaction((transaction) => ensureDefaultCategories(transaction, user.id));

  const accessToken = jwt.sign({}, authConfig.secret, {
    algorithm: "HS256",
    subject: user.id,
    issuer: authConfig.issuer,
    audience: authConfig.audience,
    expiresIn: authConfig.accessTokenTtlSeconds,
  });

  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      avatarUpdatedAt: user.avatarUpdatedAt,
    },
  };
}

export async function getSafeUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect,
  });
}

export async function updateUserProfile(userId: string, input: UpdateProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data: input,
    select: safeUserSelect,
  });
}

export async function saveUserAvatar(userId: string, image: Buffer, mimeType: string) {
  const avatarUpdatedAt = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: { avatarData: Uint8Array.from(image), avatarMimeType: mimeType, avatarUpdatedAt },
  });
  return avatarUpdatedAt;
}

export async function getUserAvatar(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: avatarSelect,
  });
}

export async function removeUserAvatar(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarData: null, avatarMimeType: null, avatarUpdatedAt: null },
    select: safeUserSelect,
  });
}
