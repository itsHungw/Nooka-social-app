import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

type Props = {
  count: number;
  onPress: () => void;
};

/**
 * Pin Google — chỉ hiện số quán trong viewport. Click để focus vào cluster.
 *
 * Chỉ là một pin duy nhất ở giữa, KHÔNG scale lên thành "mỗi quán một pin":
 * AGENTS.md cảnh báo overlay re-render toàn bộ khi region đổi, và ghim
 * chồng lên nhau khi quán dày đặc. 60 quán × 60 view = bài toán drag.
 */
export function GooglePin({ count, onPress }: Props) {
  const { colors } = useNookaTheme();

  if (count === 0) return null;

  return (
    <Pressable
      accessibilityLabel={t('map.googlePinLabel', { count })}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, { opacity: pressed ? 0.85 : 1 }]}>
      <View
        style={[
          styles.pill,
          { backgroundColor: colors.inverseSurface, borderColor: colors.accent },
        ]}>
        <View style={[styles.dot, { backgroundColor: colors.accent }]} />
        <Text style={[styles.count, { color: colors.onInverse }]}>{String(count)}</Text>
      </View>
      <View style={[styles.stem, { backgroundColor: colors.inverseSurface }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  count: { fontSize: 12, fontWeight: '700' },
  stem: { width: 2, height: 9 },
});