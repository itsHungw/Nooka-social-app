import { clearAuthTokens, getAuthTokens, saveAuthTokens } from '@/lib/auth-session';
import {
  AuthApiError,
  getCurrentUserWithDependencies,
  logoutWithDependencies,
  refreshAuthSessionWithDependencies,
  type AuthTokens,
} from './auth-api-core.ts';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
};

export type AuthResponse = AuthTokens & { user: AuthUser };

export { AuthApiError };

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new AuthApiError(response.status, payload?.detail ?? 'Request failed');
  }
  return response.json() as Promise<T>;
}

async function request<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(API_BASE_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

async function getRequest<T>(path: string): Promise<T> {
  const response = await fetch(API_BASE_URL + path);
  return parseResponse<T>(response);
}

async function authorizedGetRequest<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(API_BASE_URL + path, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseResponse<T>(response);
}

export type RegistrationVerificationResponse = {
  registrationToken: string;
  email: string;
};

export async function register(input: { email: string; password: string }) {
  return request<{ message: string; email: string }>('/auth/register', input);
}

export async function checkUsernameAvailability(username: string) {
  const response = await getRequest<{ available: boolean }>(
    `/auth/username-availability?username=${encodeURIComponent(username.trim())}`,
  );
  return response.available;
}

export async function checkEmailAvailability(email: string) {
  const response = await getRequest<{ available: boolean }>(
    `/auth/email-availability?email=${encodeURIComponent(email.trim())}`,
  );
  return response.available;
}

export async function resendVerification(email: string) {
  return request<{ message: string }>('/auth/resend-verification', { email });
}

export async function requestPasswordReset(email: string) {
  return request<{ message: string }>('/auth/forgot-password', { email });
}

export async function resetPassword(input: { email: string; code: string; newPassword: string }) {
  return request<{ message: string }>('/auth/reset-password', input);
}

export async function verifyEmail(input: { email: string; code: string }) {
  return request<RegistrationVerificationResponse>('/auth/verify-email', input);
}

export async function completeRegistration(input: {
  registrationToken: string;
  displayName: string;
  username: string;
}) {
  const response = await request<AuthResponse>('/auth/register/complete', input);
  await saveAuthTokens(response);
  return response;
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
  return refreshAuthSessionWithDependencies<AuthResponse>({
    getTokens: getAuthTokens,
    saveTokens: saveAuthTokens,
    clearTokens: clearAuthTokens,
    postJson: request,
  });
}

export async function getCurrentUser() {
  return getCurrentUserWithDependencies<AuthUser, AuthTokens>({
    getTokens: getAuthTokens,
    refreshSession: refreshAuthSession,
    clearTokens: clearAuthTokens,
    getJsonWithAccessToken: authorizedGetRequest,
  });
}

export async function logout() {
  return logoutWithDependencies({
    getTokens: getAuthTokens,
    clearTokens: clearAuthTokens,
    postJson: request,
  });
}
