import type { ErrorRequestHandler } from "express";

function getClientErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }

  const { status } = error;
  if (typeof status !== "number" || status < 400 || status >= 500) {
    return undefined;
  }

  return status;
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const clientErrorStatus = getClientErrorStatus(error);
  const status = clientErrorStatus ?? 500;
  const message = clientErrorStatus === undefined ? "Internal server error" : "Invalid request";

  response.status(status).json({
    error: { message },
  });
};
