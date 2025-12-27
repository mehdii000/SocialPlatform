// Token Storage Service - Modular JWT management
// Easy to swap storage mechanism (localStorage, sessionStorage, cookies, etc.)

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
}

// Token operations
export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// User operations
export function saveUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): StoredUser | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function removeUser(): void {
  localStorage.removeItem(USER_KEY);
}

// Auth state
export function isAuthenticated(): boolean {
  return !!getToken();
}

// Clear all auth data
export function clearAuth(): void {
  removeToken();
  removeUser();
}

// Save complete auth session
export function saveSession(token: string, user: StoredUser): void {
  saveToken(token);
  saveUser(user);
}
