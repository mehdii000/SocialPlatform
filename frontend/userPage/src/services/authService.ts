// Auth API Service - Placeholder endpoints for backend integration
// Replace simulated responses with actual API calls when backend is ready

import { saveSession, clearAuth, getToken } from './tokenService';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name: string;
}

// API Configuration - Update when backend is ready
const API_BASE_URL = '/api';

const ENDPOINTS = {
  login: `${API_BASE_URL}/auth/login`,
  signup: `${API_BASE_URL}/auth/signup`,
  logout: `${API_BASE_URL}/auth/logout`,
  me: `${API_BASE_URL}/auth/me`,
};

/**
 * Login user with email and password
 * TODO: Replace with actual API call
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  console.log('Login API call to:', ENDPOINTS.login);

  // TODO: Uncomment and use when backend is ready
  // const response = await fetch(ENDPOINTS.login, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(credentials),
  // });
  // const data = await response.json();
  // if (data.success && data.token) {
  //   saveSession(data.token, data.user);
  // }
  // return data;

  // Simulated response
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = { id: '1', email: credentials.email, name: 'Demo User' };
      const token = 'simulated-jwt-token';
      saveSession(token, user);
      resolve({ success: true, user, token });
    }, 800);
  });
}

/**
 * Register new user
 * TODO: Replace with actual API call
 */
export async function signup(credentials: SignupCredentials): Promise<AuthResponse> {
  console.log('Signup API call to:', ENDPOINTS.signup);

  // TODO: Uncomment and use when backend is ready
  // const response = await fetch(ENDPOINTS.signup, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(credentials),
  // });
  // const data = await response.json();
  // if (data.success && data.token) {
  //   saveSession(data.token, data.user);
  // }
  // return data;

  // Simulated response
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = { id: '1', email: credentials.email, name: credentials.name };
      const token = 'simulated-jwt-token';
      saveSession(token, user);
      resolve({ success: true, user, token });
    }, 800);
  });
}

/**
 * Logout current user
 * TODO: Replace with actual API call
 */
export async function logout(): Promise<{ success: boolean }> {
  console.log('Logout API call to:', ENDPOINTS.logout);

  // TODO: Uncomment when backend is ready
  // await fetch(ENDPOINTS.logout, {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${getToken()}` },
  // });

  clearAuth();
  return { success: true };
}

/**
 * Get current authenticated user
 * TODO: Replace with actual API call
 */
export async function getCurrentUser(): Promise<AuthResponse> {
  const token = getToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  console.log('Get user API call to:', ENDPOINTS.me);

  // TODO: Uncomment when backend is ready
  // const response = await fetch(ENDPOINTS.me, {
  //   headers: { 'Authorization': `Bearer ${token}` },
  // });
  // return response.json();

  return { success: false, error: 'Not implemented' };
}

// Re-export token utilities for convenience
export { isAuthenticated, getToken, getUser, clearAuth } from './tokenService';
