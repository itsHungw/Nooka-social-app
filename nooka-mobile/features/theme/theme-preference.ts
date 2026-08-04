import type { ColorSchemeName } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ActiveColorScheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = '@nooka/theme-preference';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveThemeScheme(
  preference: ThemePreference,
  systemScheme: ColorSchemeName,
): ActiveColorScheme {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }

  return preference;
}
