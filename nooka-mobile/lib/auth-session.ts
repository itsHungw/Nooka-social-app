import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AuthTokens } from './auth-api-core.ts';

export type { AuthTokens };

const STORAGE_KEY = 'nooka.auth.tokens';

export async function saveAuthTokens(tokens: AuthTokens) {
  const serialized = JSON.stringify(tokens);
  if (Platform.OS === 'web') {
    localStorage.setItem(STORAGE_KEY, serialized);
  } else {
    await SecureStore.setItemAsync(STORAGE_KEY, serialized);
  }
}

export async function getAuthTokens(): Promise<AuthTokens | null> {
  const serialized = Platform.OS === 'web'
    ? localStorage.getItem(STORAGE_KEY)
    : await SecureStore.getItemAsync(STORAGE_KEY);
  if (!serialized) return null;
  try {
    return JSON.parse(serialized) as AuthTokens;
  } catch {
    await clearAuthTokens();
    return null;
  }
}

export async function clearAuthTokens() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  }
}
