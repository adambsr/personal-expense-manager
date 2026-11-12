import { z } from "zod";
import { apiBaseUrl } from "@/lib/api-base-url";
import type { Credentials } from "./auth-validation";

const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.iso.datetime(),
  avatarUpdatedAt: z.iso.datetime().nullable(),
});

const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number().int().positive(),
  user: userSchema,
});

const currentUserResponseSchema = z.object({ user: userSchema });
const registerResponseSchema = z.object({ user: userSchema });

interface ValidationDetail {
  field: string;
  message: string;
}

export class AuthApiError extends Error {
  readonly status: number;
  readonly details: ValidationDetail[];

  constructor(
    message: string,
    status: number,
    details: ValidationDetail[] = [],
  ) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function requestData(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    credentials?: Credentials;
    token?: string;
    signal?: AbortSignal;
    jsonBody?: unknown;
    rawBody?: BodyInit;
    contentType?: string;
  },
): Promise<unknown> {
  const headers = new Headers({ Accept: "application/json" });
  if (options.credentials || options.jsonBody !== undefined) headers.set("Content-Type", "application/json");
  if (options.contentType) headers.set("Content-Type", options.contentType);
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.credentials
        ? JSON.stringify(options.credentials)
        : options.jsonBody !== undefined
          ? JSON.stringify(options.jsonBody)
          : options.rawBody,
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new AuthApiError("Unable to reach the server. Check your connection and try again.", 0);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AuthApiError("The server returned an unreadable response. Please try again.", response.status);
  }

  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : undefined;
    const message = error && typeof error.message === "string"
      ? error.message
      : "The request could not be completed. Please try again.";
    const details = error && Array.isArray(error.details)
      ? error.details.filter((detail): detail is ValidationDetail =>
          isRecord(detail) && typeof detail.field === "string" && typeof detail.message === "string",
        )
      : [];
    throw new AuthApiError(message, response.status, details);
  }

  if (!isRecord(payload) || !("data" in payload)) {
    throw new AuthApiError("The server returned an invalid response.", response.status);
  }

  return payload.data;
}

function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AuthApiError("The server returned an invalid authentication response.", 502);
  }
  return result.data;
}

export async function loginWithCredentials(credentials: Credentials) {
  const data = await requestData("/api/auth/login", { method: "POST", credentials });
  return parseResponse(loginResponseSchema, data);
}

export async function registerWithCredentials(credentials: Credentials): Promise<void> {
  const data = await requestData("/api/auth/register", { method: "POST", credentials });
  parseResponse(registerResponseSchema, data);
}

export async function getCurrentUser(token: string, signal?: AbortSignal) {
  const data = await requestData("/api/auth/me", { token, signal });
  return parseResponse(currentUserResponseSchema, data).user;
}

export async function updateCurrentUser(token: string, profile: { firstName: string; lastName: string }) {
  const data = await requestData("/api/auth/me", { method: "PUT", token, jsonBody: profile });
  return parseResponse(currentUserResponseSchema, data).user;
}

export async function uploadCurrentUserAvatar(token: string, file: File) {
  const data = await requestData("/api/auth/me/avatar", {
    method: "PUT",
    token,
    rawBody: file,
    contentType: file.type,
  });
  const result = z.object({ avatarUpdatedAt: z.iso.datetime() }).safeParse(data);
  if (!result.success) throw new AuthApiError("The server returned an invalid profile picture response.", 502);
  return result.data.avatarUpdatedAt;
}

export async function deleteCurrentUserAvatar(token: string) {
  const data = await requestData("/api/auth/me/avatar", { method: "DELETE", token });
  return parseResponse(currentUserResponseSchema, data).user;
}

export async function getCurrentUserAvatar(token: string, signal?: AbortSignal) {
  const headers = new Headers({ Accept: "image/avif,image/webp,image/png,image/jpeg" });
  headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/auth/me/avatar`, { headers, signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AuthApiError("Unable to load your profile picture.", 0);
  }

  if (response.status === 404) return null;
  if (!response.ok) throw new AuthApiError("Unable to load your profile picture.", response.status);
  return response.blob();
}

export type AuthUser = z.infer<typeof userSchema>;
