export const ACCESS_TOKEN_KEY = "accessToken";
export const SESSION_INVALIDATED_EVENT = "auth:session-invalidated";

export function getAccessToken(): string | null {
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeAccessToken(token: string): void {
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.dispatchEvent(new Event(SESSION_INVALIDATED_EVENT));
}
