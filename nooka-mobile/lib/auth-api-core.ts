export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

export class AuthApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type RefreshDependencies<TTokens extends AuthTokens> = {
  getTokens: () => Promise<AuthTokens | null>;
  saveTokens: (tokens: TTokens) => Promise<void>;
  clearTokens: () => Promise<void>;
  postJson: (path: string, body: unknown) => Promise<TTokens>;
};

type LogoutDependencies<TTokens extends AuthTokens> = {
  getTokens: () => Promise<TTokens | null>;
  clearTokens: () => Promise<void>;
  postJson: (path: string, body: unknown) => Promise<unknown>;
};

type CurrentUserDependencies<TUser, TTokens extends AuthTokens> = {
  getTokens: () => Promise<TTokens | null>;
  refreshSession: () => Promise<TTokens | null>;
  clearTokens: () => Promise<void>;
  getJsonWithAccessToken: (path: string, accessToken: string) => Promise<TUser>;
};

export async function refreshAuthSessionWithDependencies<TTokens extends AuthTokens>({
  getTokens,
  saveTokens,
  clearTokens,
  postJson,
}: RefreshDependencies<TTokens>): Promise<TTokens | null> {
  const stored = await getTokens();
  if (!stored) return null;

  try {
    const response = await postJson('/auth/refresh', { refreshToken: stored.refreshToken });
    await saveTokens(response);
    return response;
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 401) {
      await clearTokens();
      return null;
    }
    throw error;
  }
}

export async function logoutWithDependencies<TTokens extends AuthTokens>({
  getTokens,
  clearTokens,
  postJson,
}: LogoutDependencies<TTokens>): Promise<void> {
  const stored = await getTokens();
  try {
    if (stored) {
      await postJson('/auth/logout', { refreshToken: stored.refreshToken });
    }
  } catch {
    // Local logout must still complete if the network is gone or the session was already revoked.
  } finally {
    await clearTokens();
  }
}

export async function getCurrentUserWithDependencies<TUser, TTokens extends AuthTokens>({
  getTokens,
  refreshSession,
  clearTokens,
  getJsonWithAccessToken,
}: CurrentUserDependencies<TUser, TTokens>): Promise<TUser | null> {
  const stored = await getTokens();
  if (!stored) return null;

  try {
    return await getJsonWithAccessToken('/auth/me', stored.accessToken);
  } catch (error) {
    if (!(error instanceof AuthApiError) || error.status !== 401) {
      throw error;
    }
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    await clearTokens();
    return null;
  }

  try {
    return await getJsonWithAccessToken('/auth/me', refreshed.accessToken);
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 401) {
      await clearTokens();
      return null;
    }
    throw error;
  }
}
