import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

/**
 * Bản đồ trang trí: vài dải đường và ô nhà trên nền đất.
 *
 * ponytail: không kéo `react-native-maps` vào chỉ để có một hình nền — nó là
 * native module, cần API key và chưa chắc hợp New Architecture. Thay bằng bản
 * đồ thật khi màn hình cần pan/zoom thật, không phải sớm hơn.
 */
export function FakeMap({ children, style, showUser = false }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; showUser?: boolean }>) {
  const { colors } = useNookaTheme();

  return (
    <View style={[styles.map, { backgroundColor: colors.mapBackground }, style]}>
      <View style={[styles.roadH, { top: '38%', height: 14, backgroundColor: colors.mapRoad }]} />
      <View style={[styles.roadH, { top: '74%', height: 9, backgroundColor: colors.mapRoad }]} />
      <View style={[styles.roadV, { left: '25%', width: 12, backgroundColor: colors.mapRoad }]} />
      <View style={[styles.roadV, { left: '60%', width: 8, backgroundColor: colors.mapRoad }]} />
      <View style={[styles.block, { left: '30%', top: '48%', width: 96, height: 58, backgroundColor: colors.mapBlock }]} />
      <View style={[styles.block, { left: '64%', top: '14%', width: 70, height: 52, backgroundColor: colors.mapPark }]} />
      {children}
      {showUser ? (
        <View
          accessibilityLabel={t('map.youAreHere')}
          style={[styles.user, { backgroundColor: colors.locationDot, borderColor: colors.surface }]}
        />
      ) : null}
    </View>
  );
}

export function MapPin({
  count,
  label,
  left,
  top,
  onPress,
}: {
  count: number;
  label: string;
  left: string;
  top: string;
  onPress: () => void;
}) {
  const { colors } = useNookaTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pin,
        { left: left as ViewStyle['left'], top: top as ViewStyle['top'], backgroundColor: colors.inverseSurface, opacity: pressed ? 0.75 : 1 },
      ]}>
      <View style={[styles.pinDot, { backgroundColor: colors.accent }]} />
      <Text style={[styles.pinCount, { color: colors.onInverse }]}>{String(count)}</Text>
    </Pressable>
  );
}

/** Pin cố định giữa màn chọn địa điểm — người dùng kéo bản đồ dưới nó. */
export function CenterPin({ label }: { label: string }) {
  const { colors } = useNookaTheme();

  return (
    <View pointerEvents="none" style={styles.centerPin}>
      <View style={[styles.centerPinLabel, { backgroundColor: colors.inverseSurface }]}>
        <Text style={[styles.centerPinText, { color: colors.onInverse }]}>{label}</Text>
      </View>
      <View style={[styles.centerPinStem, { backgroundColor: colors.inverseSurface }]} />
      <View style={[styles.centerPinHead, { backgroundColor: colors.accent, borderColor: colors.inverseSurface }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { overflow: 'hidden' },
  roadH: { position: 'absolute', left: 0, right: 0 },
  roadV: { position: 'absolute', top: 0, bottom: 0 },
  block: { position: 'absolute', borderRadius: 4 },
  user: {
    position: 'absolute',
    left: '50%',
    bottom: 26,
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
  },
  pin: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  pinDot: { width: 7, height: 7, borderRadius: 4 },
  pinCount: { fontSize: 11.5, lineHeight: 16, fontWeight: '700' },
  centerPin: { position: 'absolute', left: 0, right: 0, top: '38%', alignItems: 'center' },
  centerPinLabel: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  centerPinText: { fontSize: 12.5, lineHeight: 17, fontWeight: '700' },
  centerPinStem: { width: 2, height: 16 },
  centerPinHead: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, marginTop: -2 },
});
