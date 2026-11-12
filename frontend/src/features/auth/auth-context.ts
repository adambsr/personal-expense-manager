import { createContext } from "react";
import type { AuthUser } from "./auth-api";
import type { Credentials } from "./auth-validation";

export type AuthState =
  | { status: "checking" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

export interface AuthContextValue {
  status: AuthState["status"];
  user: AuthUser | null;
  errorMessage: string | null;
  login: (credentials: Credentials) => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
  retrySessionRestore: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
