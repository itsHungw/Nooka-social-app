import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

const routeItems = {
  index: { labelKey: 'navigation.home', icon: 'home-outline', activeIcon: 'home' },
  search: { labelKey: 'navigation.search', icon: 'search-outline', activeIcon: 'search' },
  saved: { labelKey: 'navigation.saved', icon: 'bookmark-outline', activeIcon: 'bookmark' },
  profile: { labelKey: 'navigation.profile', icon: 'person-outline', activeIcon: 'person' },
} as const;

type RouteName = keyof typeof routeItems;

export function NookaTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useNookaTheme();

  const renderRoute = (routeName: RouteName) => {
    const routeIndex = state.routes.findIndex((route) => route.name === routeName);
    if (routeIndex < 0) return null;
    const route = state.routes[routeIndex];
    const item = routeItems[routeName];
    const selected = state.index === routeIndex;

    return (
      <Pressable
        accessibilityLabel={t(item.labelKey)}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        key={route.key}
        onPress={() => navigation.navigate(route.name)}
        style={styles.tabItem}>
        <Ionicons
          color={selected ? colors.tabIconSelected : colors.tabIconDefault}
          name={(selected ? item.activeIcon : item.icon) as keyof typeof Ionicons.glyphMap}
          size={22}
        />
        <Text style={[styles.tabLabel, { color: selected ? colors.tabIconSelected : colors.tabIconDefault }]}>
          {t(item.labelKey)}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.surface, borderColor: colors.border }]}>
      {renderRoute('index')}
      {renderRoute('search')}
      <Pressable
        accessibilityLabel={t('navigation.create')}
        accessibilityRole="button"
        onPress={() => router.push('/create')}
        style={({ pressed }) => [styles.createButton, { backgroundColor: colors.accent, opacity: pressed ? 0.75 : 1 }]}>
        <Ionicons color={colors.onAccent} name="add" size={30} />
      </Pressable>
      {renderRoute('saved')}
      {renderRoute('profile')}
    </View>
  );
}

export function CreateRouteTabBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useNookaTheme();
  const items = [
    { href: '/', labelKey: 'navigation.home', icon: 'home-outline' },
    { href: '/search', labelKey: 'navigation.search', icon: 'search-outline' },
    { href: '/saved', labelKey: 'navigation.saved', icon: 'bookmark-outline' },
    { href: '/profile', labelKey: 'navigation.profile', icon: 'person-outline' },
  ] as const;

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.surface, borderColor: colors.border }]}>
      {items.slice(0, 2).map((item) => (
        <Pressable accessibilityLabel={t(item.labelKey)} accessibilityRole="tab" key={item.href} onPress={() => router.replace(item.href)} style={styles.tabItem}>
          <Ionicons color={colors.tabIconDefault} name={item.icon} size={22} />
          <Text style={[styles.tabLabel, { color: colors.tabIconDefault }]}>{t(item.labelKey)}</Text>
        </Pressable>
      ))}
      <View style={[styles.createButton, { backgroundColor: colors.accent }]}>
        <Ionicons color={colors.onAccent} name="add" size={30} />
      </View>
      {items.slice(2).map((item) => (
        <Pressable accessibilityLabel={t(item.labelKey)} accessibilityRole="tab" key={item.href} onPress={() => router.replace(item.href)} style={styles.tabItem}>
          <Ionicons color={colors.tabIconDefault} name={item.icon} size={22} />
          <Text style={[styles.tabLabel, { color: colors.tabIconDefault }]}>{t(item.labelKey)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { minHeight: 70, borderTopWidth: 1, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 8, paddingHorizontal: 8 },
  tabItem: { flex: 1, minWidth: 58, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 9, lineHeight: 12, fontWeight: '500' },
  createButton: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginHorizontal: 5 },
});
