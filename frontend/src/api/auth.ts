import type { LoginRequest, RegisterRequest, TokenResponse } from '@/types';
import { api, setAccessToken } from './client';

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/api/auth/login', data);
  if (res.jwt_token) {
    setAccessToken(res.jwt_token);
  }
  return res;
}

export async function register(data: RegisterRequest): Promise<{ message: string }> {
  return api.post<{ message: string }>('/api/auth/signup', data);
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout');
  setAccessToken(null);
}

export async function validateToken(): Promise<{ user_id: string; username: string }> {
  return api.get<{ user_id: string; username: string }>('/api/auth/validate');
}

export async function silentRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.access_token);
    return true;
  } catch {
    return false;
  }
}
