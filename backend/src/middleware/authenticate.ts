import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { authConfig } from "../config/auth";

function unauthorized(response: Parameters<RequestHandler>[1], message: string): void {
  response.status(401).json({ error: { message } });
}

export const authenticate: RequestHandler = (request, response, next) => {
  const authorization = request.get("authorization");
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  const token = match?.[1];

  if (!token) {
    unauthorized(response, "Authentication required");
    return;
  }

  try {
    const payload = jwt.verify(token, authConfig.secret, {
      algorithms: ["HS256"],
      issuer: authConfig.issuer,
      audience: authConfig.audience,
    });

    if (typeof payload === "string" || typeof payload.sub !== "string") {
      unauthorized(response, "Invalid or expired access token");
      return;
    }

    request.auth = { userId: payload.sub };
    next();
  } catch {
    unauthorized(response, "Invalid or expired access token");
  }
};
