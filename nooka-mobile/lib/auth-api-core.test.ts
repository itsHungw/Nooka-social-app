import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  AuthApiError,
  getCurrentUserWithDependencies,
  logoutWithDependencies,
  refreshAuthSessionWithDependencies,
  type AuthTokens,
} from './auth-api-core.ts';

const storedTokens: AuthTokens = {
  accessToken: 'old-access',
  refreshToken: 'old-refresh',
  accessTokenExpiresAt: '2026-08-10T12:15:00Z',
  refreshTokenExpiresAt: '2026-09-09T12:00:00Z',
};

const rotatedTokens: AuthTokens = {
  accessToken: 'new-access',
  refreshToken: 'new-refresh',
  accessTokenExpiresAt: '2026-08-10T12:30:00Z',
  refreshTokenExpiresAt: '2026-09-09T12:15:00Z',
};

test('logout sends the stored refresh token and clears local tokens', async () => {
  const posts: unknown[] = [];
  let cleared = 0;

  await logoutWithDependencies({
    getTokens: async () => storedTokens,
    clearTokens: async () => { cleared += 1; },
    postJson: async (_path, body) => {
      posts.push(body);
      return { message: 'Logged out' };
    },
  });

  assert.deepEqual(posts, [{ refreshToken: 'old-refresh' }]);
  assert.equal(cleared, 1);
});

test('logout still clears local tokens when the backend rejects the logout request', async () => {
  let cleared = 0;

  await logoutWithDependencies({
    getTokens: async () => storedTokens,
    clearTokens: async () => { cleared += 1; },
    postJson: async () => {
      throw new AuthApiError(500, 'Server unavailable');
    },
  });

  assert.equal(cleared, 1);
});

test('refresh saves rotated tokens when backend accepts the refresh token', async () => {
  let saved: AuthTokens | null = null;

  const response = await refreshAuthSessionWithDependencies({
    getTokens: async () => storedTokens,
    saveTokens: async (tokens) => { saved = tokens; },
    clearTokens: async () => { throw new Error('should not clear'); },
    postJson: async (_path, body) => {
      assert.deepEqual(body, { refreshToken: 'old-refresh' });
      return rotatedTokens;
    },
  });

  assert.deepEqual(response, rotatedTokens);
  assert.deepEqual(saved, rotatedTokens);
});

test('refresh clears stale local tokens and returns null when backend returns unauthorized', async () => {
  let cleared = 0;

  const response = await refreshAuthSessionWithDependencies({
    getTokens: async () => storedTokens,
    saveTokens: async () => { throw new Error('should not save'); },
    clearTokens: async () => { cleared += 1; },
    postJson: async () => {
      throw new AuthApiError(401, 'Refresh session is invalid or expired');
    },
  });

  assert.equal(response, null);
  assert.equal(cleared, 1);
});

test('current user lookup refreshes once when the stored access token is expired', async () => {
  const accessTokens: string[] = [];
  const user = { id: 'user-1', email: 'me@example.test' };

  const response = await getCurrentUserWithDependencies({
    getTokens: async () => storedTokens,
    refreshSession: async () => rotatedTokens,
    clearTokens: async () => { throw new Error('should not clear'); },
    getJsonWithAccessToken: async (_path, accessToken) => {
      accessTokens.push(accessToken);
      if (accessToken === 'old-access') {
        throw new AuthApiError(401, 'Expired access token');
      }
      return user;
    },
  });

  assert.deepEqual(response, user);
  assert.deepEqual(accessTokens, ['old-access', 'new-access']);
});

test('current user lookup clears tokens when refresh cannot restore the session', async () => {
  let cleared = 0;

  const response = await getCurrentUserWithDependencies({
    getTokens: async () => storedTokens,
    refreshSession: async () => null,
    clearTokens: async () => { cleared += 1; },
    getJsonWithAccessToken: async () => {
      throw new AuthApiError(401, 'Expired access token');
    },
  });

  assert.equal(response, null);
  assert.equal(cleared, 1);
});
