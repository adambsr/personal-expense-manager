import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AuthApiError, getCurrentUser, loginWithCredentials, registerWithCredentials } from "./auth-api";
import { AuthContext, type AuthContextValue, type AuthState } from "./auth-context";
import type { Credentials } from "./auth-validation";
import { clearAccessToken, getAccessToken, SESSION_INVALIDATED_EVENT, storeAccessToken } from "./auth-session";

function initialAuthState(): AuthState {
  return getAccessToken() ? { status: "checking" } : { status: "unauthenticated" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const controller = new AbortController();
    getCurrentUser(token, controller.signal)
      .then((user) => setAuthState({ status: "authenticated", user }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        if (error instanceof AuthApiError && (error.status === 401 || error.status === 404)) {
          clearAccessToken();
          setAuthState({ status: "unauthenticated" });
          return;
        }

        setAuthState({
          status: "error",
          message: error instanceof Error ? error.message : "We could not restore your session.",
        });
      });

    return () => controller.abort();
  }, [restoreAttempt]);

  useEffect(() => {
    const handleSessionInvalidated = () => setAuthState({ status: "unauthenticated" });
    window.addEventListener(SESSION_INVALIDATED_EVENT, handleSessionInvalidated);
    return () => window.removeEventListener(SESSION_INVALIDATED_EVENT, handleSessionInvalidated);
  }, []);

  const login = useCallback(async (credentials: Credentials) => {
    const result = await loginWithCredentials(credentials);
    storeAccessToken(result.accessToken);
    setAuthState({ status: "authenticated", user: result.user });
  }, []);

  const register = useCallback(async (credentials: Credentials) => {
    await registerWithCredentials(credentials);

    try {
      await login(credentials);
    } catch {
      throw new AuthApiError(
        "Your account was created, but we could not sign you in. Please log in with your new account.",
        500,
      );
    }
  }, [login]);

  const logout = useCallback(() => {
    clearAccessToken();
    setAuthState({ status: "unauthenticated" });
  }, []);

  const updateUser = useCallback((user: NonNullable<AuthContextValue["user"]>) => {
    setAuthState({ status: "authenticated", user });
  }, []);

  const retrySessionRestore = useCallback(() => {
    if (!getAccessToken()) {
      setAuthState({ status: "unauthenticated" });
      return;
    }

    setAuthState({ status: "checking" });
    setRestoreAttempt((attempt) => attempt + 1);
  }, []);

  const value: AuthContextValue = {
    status: authState.status,
    user: authState.status === "authenticated" ? authState.user : null,
    errorMessage: authState.status === "error" ? authState.message : null,
    login,
    register,
    updateUser,
    logout,
    retrySessionRestore,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
