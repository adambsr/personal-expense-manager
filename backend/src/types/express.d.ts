import type { AuthenticatedUserContext } from "./auth";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUserContext;
    }
  }
}

export {};
