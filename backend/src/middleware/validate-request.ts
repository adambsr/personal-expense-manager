import type { RequestHandler } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { z } from "zod";

function validationErrorResponse(issues: z.ZodIssue[]) {
  return {
    error: {
      message: "Validation failed",
      details: issues.map((issue) => ({
        field: issue.path.map(String).join("."),
        message: issue.message,
      })),
    },
  };
}

export function validateBody<TSchema extends z.ZodType>(schema: TSchema): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      response.status(400).json(validationErrorResponse(result.error.issues));
      return;
    }

    request.body = result.data;
    next();
  };
}

export function validateParams<TSchema extends z.ZodType>(schema: TSchema): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.params);

    if (!result.success) {
      response.status(400).json(validationErrorResponse(result.error.issues));
      return;
    }

    next();
  };
}

export function validateQuery<TSchema extends z.ZodType>(
  schema: TSchema,
): RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  unknown,
  { validatedQuery: z.output<TSchema> }
> {
  return (request, response, next) => {
    const result = schema.safeParse(request.query);

    if (!result.success) {
      response.status(400).json(validationErrorResponse(result.error.issues));
      return;
    }

    response.locals.validatedQuery = result.data;
    next();
  };
}
