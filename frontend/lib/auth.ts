// Client-side auth helpers — store JWT in localStorage, parse user from it

export type AccountType = "viewer" | "creator";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  account_type: AccountType;
  department?: string;
}

const TOKEN_KEY = "redactor_token";
const USER_KEY = "redactor_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function isCreator(): boolean {
  return getUser()?.account_type === "creator";
}
