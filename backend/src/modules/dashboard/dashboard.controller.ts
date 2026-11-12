import type { Request, RequestHandler, Response } from "express";
import { getDashboardSummary } from "./dashboard.service";
import type { DashboardSummaryQuery } from "./dashboard.validation";

interface DashboardQueryLocals {
  validatedQuery: DashboardSummaryQuery;
}

function getAuthenticatedUserId(request: Pick<Request, "auth">, response: Response): string | undefined {
  const userId = request.auth?.userId;

  if (!userId) {
    response.status(401).json({ error: { message: "Authentication required" } });
  }

  return userId;
}

export const summary: RequestHandler<
  Record<string, never>,
  unknown,
  unknown,
  unknown,
  DashboardQueryLocals
> = async (request, response) => {
  const userId = getAuthenticatedUserId(request, response);
  if (!userId) return;

  const { month, year } = response.locals.validatedQuery;
  const dashboard = await getDashboardSummary(userId, month, year);

  response.status(200).json({ data: dashboard });
};
