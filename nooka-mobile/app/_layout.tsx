import Ionicons from '@expo/vector-icons/Ionicons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { NookaDemoProvider } from '@/providers/nooka-demo-provider';
import { NookaThemeProvider } from '@/providers/nooka-theme-provider';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts(Ionicons.font);

  if (!fontsLoaded) return null;

  // `GestureHandlerRootView` phải bọc ngoài cùng — sheet ba điểm dừng ở tab Tìm
  // dùng pan gesture, và không có root view này thì cử chỉ im lặng không chạy.
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NookaThemeProvider>
          <NookaDemoProvider>
            <RootNavigator />
          </NookaDemoProvider>
        </NookaThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { colorScheme, colors } = useNookaTheme();
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.tint,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ask" options={{ animation: 'slide_from_bottom', headerShown: false }} />
        <Stack.Screen name="spot/[id]" options={{ animation: 'slide_from_right', headerShown: false }} />
        <Stack.Screen name="story/[index]" options={{ animation: 'fade', headerShown: false }} />
        <Stack.Screen name="create" options={{ animation: 'slide_from_bottom', headerShown: false }} />
        <Stack.Screen name="pin" options={{ animation: 'slide_from_bottom', headerShown: false }} />
        <Stack.Screen name="caption" options={{ animation: 'slide_from_right', headerShown: false }} />
        <Stack.Screen name="review" options={{ animation: 'slide_from_bottom', headerShown: false }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right', headerShown: false }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
