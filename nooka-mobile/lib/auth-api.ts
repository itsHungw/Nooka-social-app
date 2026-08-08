import { AuthTokens, getAuthTokens, saveAuthTokens } from '@/lib/auth-session';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
};

type AuthResponse = AuthTokens & { user: AuthUser };

export class AuthApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(API_BASE_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new AuthApiError(response.status, payload?.detail ?? 'Request failed');
  }
  return response.json() as Promise<T>;
}

export async function register(input: { email: string; password: string; displayName: string; username: string }) {
  return request<{ email: string }>('/auth/register', input);
}

export async function requestPasswordReset(email: string) {
  return request<{ message: string }>('/auth/forgot-password', { email });
}

export async function resetPassword(input: { email: string; code: string; newPassword: string }) {
  return request<{ message: string }>('/auth/reset-password', input);
}

export async function verifyEmail(input: { email: string; code: string }) {
  return request<{ message: string }>('/auth/verify-email', input);
}

export async function login(input: { email: string; password: string }) {
  const response = await request<AuthResponse>('/auth/login', input);
  await saveAuthTokens(response);
  return response;
}

export async function oauthLogin(provider: 'google' | 'apple' | 'facebook', token: string) {
  const response = await request<AuthResponse>('/auth/oauth/' + provider, { token });
  await saveAuthTokens(response);
  return response;
}

export async function refreshAuthSession() {
  const stored = await getAuthTokens();
  if (!stored) return null;
  const response = await request<AuthResponse>('/auth/refresh', { refreshToken: stored.refreshToken });
  await saveAuthTokens(response);
  return response;
}
