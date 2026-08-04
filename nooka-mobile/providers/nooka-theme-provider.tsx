import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import {
  isThemePreference,
  resolveThemeScheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/features/theme/theme-preference';

type NookaThemeContextValue = {
  preference: ThemePreference;
  colorScheme: 'light' | 'dark';
  colors: (typeof Colors)['light'];
  setPreference: (preference: ThemePreference) => void;
};

const NookaThemeContext = createContext<NookaThemeContextValue | null>(null);

export function NookaThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedPreference) => {
        if (active && isThemePreference(storedPreference)) {
          setPreferenceState(storedPreference);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, nextPreference).catch(() => undefined);
  }, []);

  const colorScheme = resolveThemeScheme(preference, systemScheme);
  const value = useMemo(
    () => ({ preference, colorScheme, colors: Colors[colorScheme], setPreference }),
    [colorScheme, preference, setPreference],
  );

  return <NookaThemeContext.Provider value={value}>{children}</NookaThemeContext.Provider>;
}

export function useNookaThemeContext() {
  const context = useContext(NookaThemeContext);

  if (!context) {
    throw new Error('useNookaTheme must be used within NookaThemeProvider');
  }

  return context;
}
