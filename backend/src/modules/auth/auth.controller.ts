import type { RequestHandler } from "express";
import { authConfig } from "../../config/auth";
import { getSafeUser, getUserAvatar, loginUser, registerUser, removeUserAvatar, saveUserAvatar, updateUserProfile } from "./auth.service";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "./auth.validation";

export const register: RequestHandler<Record<string, never>, unknown, RegisterInput> = async (
  request,
  response,
) => {
  const result = await registerUser(request.body);

  if (result.kind === "duplicate") {
    response.status(409).json({ error: { message: "An account with this email already exists" } });
    return;
  }

  response.status(201).json({ data: { user: result.user } });
};

export const login: RequestHandler<Record<string, never>, unknown, LoginInput> = async (
  request,
  response,
) => {
  const result = await loginUser(request.body);

  if (!result) {
    response.status(401).json({ error: { message: "Invalid email or password" } });
    return;
  }

  response.status(200).json({
    data: {
      accessToken: result.accessToken,
      tokenType: "Bearer",
      expiresIn: authConfig.accessTokenTtlSeconds,
      user: result.user,
    },
  });
};

export const me: RequestHandler = async (request, response) => {
  const userId = request.auth?.userId;

  if (!userId) {
    response.status(401).json({ error: { message: "Authentication required" } });
    return;
  }

  const user = await getSafeUser(userId);

  if (!user) {
    response.status(404).json({ error: { message: "User not found" } });
    return;
  }

  response.status(200).json({ data: { user } });
};

export const updateMe: RequestHandler<Record<string, never>, unknown, UpdateProfileInput> = async (
  request,
  response,
) => {
  const userId = request.auth?.userId;
  if (!userId) {
    response.status(401).json({ error: { message: "Authentication required" } });
    return;
  }

  const user = await updateUserProfile(userId, request.body);
  response.status(200).json({ data: { user } });
};

const AVATAR_TYPES = new Map<string, (data: Buffer) => boolean>([
  ["image/jpeg", (data) => data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff],
  ["image/png", (data) => data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))],
  ["image/webp", (data) => data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP"],
]);

export const updateMyAvatar: RequestHandler = async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) {
    response.status(401).json({ error: { message: "Authentication required" } });
    return;
  }

  const mimeType = request.get("content-type")?.toLowerCase() ?? "";
  const isValidImage = AVATAR_TYPES.get(mimeType);
  const image = request.body;
  if (!Buffer.isBuffer(image) || image.length === 0 || !isValidImage?.(image)) {
    response.status(400).json({ error: { message: "Choose a valid PNG, JPEG, or WebP image." } });
    return;
  }

  const avatarUpdatedAt = await saveUserAvatar(userId, image, mimeType);
  response.status(200).json({ data: { avatarUpdatedAt } });
};

export const myAvatar: RequestHandler = async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) {
    response.status(401).json({ error: { message: "Authentication required" } });
    return;
  }

  const avatar = await getUserAvatar(userId);
  if (!avatar?.avatarData || !avatar.avatarMimeType) {
    response.status(404).json({ error: { message: "Profile picture not found" } });
    return;
  }

  response.set({
    "Content-Type": avatar.avatarMimeType,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.status(200).send(Buffer.from(avatar.avatarData));
};

export const deleteMyAvatar: RequestHandler = async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) {
    response.status(401).json({ error: { message: "Authentication required" } });
    return;
  }

  const user = await removeUserAvatar(userId);
  response.status(200).json({ data: { user } });
};
