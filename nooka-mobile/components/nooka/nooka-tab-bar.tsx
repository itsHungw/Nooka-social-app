import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { useStartCheckin } from '@/hooks/use-start-checkin';
import { t } from '@/lib/i18n';

const tabs = [
  { route: 'index', labelKey: 'navigation.home', icon: 'home-outline', activeIcon: 'home' },
  { route: 'search', labelKey: 'navigation.search', icon: 'search-outline', activeIcon: 'search' },
  { route: 'messages', labelKey: 'navigation.messages', icon: 'chatbubble-outline', activeIcon: 'chatbubble' },
  { route: 'profile', labelKey: 'navigation.profile', icon: 'person-outline', activeIcon: 'person' },
] as const;

/** Nút + nằm giữa, hai tab mỗi bên — bố cục 5 ô của prototype. */
export function NookaTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useNookaTheme();
  const startCheckin = useStartCheckin();

  const renderTab = (name: (typeof tabs)[number]['route']) => {
    const item = tabs.find((tab) => tab.route === name);
    const index = state.routes.findIndex((route) => route.name === name);
    if (!item || index < 0) return null;

    const selected = state.index === index;
    const color = selected ? colors.tabIconSelected : colors.tabIconDefault;

    return (
      <Pressable
        accessibilityLabel={t(item.labelKey)}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        key={name}
        onPress={() => navigation.navigate(state.routes[index].name)}
        style={styles.tabItem}>
        <Ionicons color={color} name={selected ? item.activeIcon : item.icon} size={20} />
        <Text style={[styles.tabLabel, { color, fontWeight: selected ? '700' : '600' }]}>{t(item.labelKey)}</Text>
        <View style={[styles.indicator, { backgroundColor: selected ? colors.accentStrong : 'transparent' }]} />
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.surface, borderColor: colors.borderSubtle },
      ]}>
      {renderTab('index')}
      {renderTab('search')}
      <Pressable
        accessibilityLabel={t('navigation.create')}
        accessibilityRole="button"
        onPress={startCheckin}
        style={({ pressed }) => [
          styles.createButton,
          { backgroundColor: pressed ? colors.inverseSurfacePressed : colors.inverseSurface },
        ]}>
        <Ionicons color={colors.onInverse} name="add" size={26} />
      </Pressable>
      {renderTab('messages')}
      {renderTab('profile')}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 16 },
  tabItem: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabLabel: { fontSize: 10.5, lineHeight: 14 },
  indicator: { width: 16, height: 2, borderRadius: 2 },
  createButton: {
    width: 50,
    height: 50,
    marginTop: -6,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
