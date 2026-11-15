import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { authConfig } from "../config/auth";
import { prisma } from "../lib/prisma";

function unauthorized(response: Parameters<RequestHandler>[1], message: string): void {
  response.status(401).json({ error: { message } });
}

export const authenticate: RequestHandler = async (request, response, next) => {
  const authorization = request.get("authorization");
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  const token = match?.[1];

  if (!token) {
    unauthorized(response, "Authentication required");
    return;
  }

  let userId: string;
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

    userId = payload.sub;
  } catch {
    unauthorized(response, "Invalid or expired access token");
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) {
    unauthorized(response, "Invalid or inactive account");
    return;
  }

  request.auth = { userId: user.id, role: user.role };
  next();
};

export const requireAdmin: RequestHandler = (request, response, next) => {
  if (request.auth?.role !== "ADMIN") {
    response.status(403).json({ error: { message: "Administrator access required" } });
    return;
  }
  next();
};
