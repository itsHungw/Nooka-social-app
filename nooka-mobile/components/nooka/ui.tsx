import Ionicons from '@expo/vector-icons/Ionicons';
import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { NookaMascot } from '@/components/nooka/nooka-mascot';
import type { PhotoTint, Tint } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

/**
 * Bộ primitive dựng từ prototype `Nooka - prototype.dc.html`.
 *
 * Prototype có hai hệ nền: màn thường (nền kem, mực đậm) và màn luôn tối
 * (camera, caption, story). `ScreenShell` lo hệ đầu, `DarkScreen` lo hệ sau.
 */

type ScreenShellProps = PropsWithChildren<{
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>;

export function ScreenShell({ children, edges = ['top'], style, testID }: ScreenShellProps) {
  const { colors } = useNookaTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.fill, { backgroundColor: colors.background }, style]}
      testID={testID}>
      {children}
      <Toast />
    </SafeAreaView>
  );
}

export function DarkScreen({ children, edges = ['top'], testID }: ScreenShellProps) {
  const { colors } = useNookaTheme();

  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: colors.cameraBackground }]} testID={testID}>
      {children}
      <Toast />
    </SafeAreaView>
  );
}

function Toast() {
  const { colors } = useNookaTheme();
  const { toast } = useNookaDemo();

  if (!toast) return null;

  return (
    <View accessibilityLiveRegion="polite" pointerEvents="none" style={[styles.toast, { backgroundColor: colors.inverseSurface }]}>
      <Text style={[styles.toastText, { color: colors.onInverse }]}>{toast}</Text>
    </View>
  );
}

/** Thanh "Hỏi Nooka" — dùng chung ở Trang chủ và tab Bản đồ. */
export function AskNookaBar({ onPress, hint }: { onPress: () => void; hint?: string }) {
  const { colors } = useNookaTheme();

  return (
    <Pressable
      accessibilityLabel={t('home.askNooka')}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.askBar,
        { backgroundColor: pressed ? colors.inverseSurfacePressed : colors.inverseSurface },
      ]}>
      <View style={[styles.askDot, { borderColor: colors.accent }]} />
      <Text numberOfLines={1} style={[styles.askText, { color: colors.onInverse }]}>{t('home.askNooka')}</Text>
      {hint ? <Text style={[styles.askHint, { color: colors.textSubtle }]}>{hint}</Text> : null}
      <NookaMascot />
    </Pressable>
  );
}

/** Nền giả cho ảnh chưa tải. Mỗi địa điểm ghim một tint ở `spots.ts`. */
export function Photo({ tint, style, children }: PropsWithChildren<{ tint: Tint; style?: StyleProp<ViewStyle> }>) {
  const { colors } = useNookaTheme();
  return <View style={[{ backgroundColor: colors[tint], overflow: 'hidden' }, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: string }) {
  const { colors } = useNookaTheme();
  return <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{children}</Text>;
}

type ButtonTone = 'primary' | 'outline' | 'accent' | 'soft';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  tone?: ButtonTone;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  selected?: boolean;
  loading?: boolean;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  tone = 'primary',
  style,
  accessibilityLabel,
  selected,
  loading,
  disabled,
}: ButtonProps) {
  const { colors } = useNookaTheme();
  const palette: Record<ButtonTone, { background: string; text: string; border: string }> = {
    primary: { background: colors.inverseSurface, text: colors.onInverse, border: colors.inverseSurface },
    accent: { background: colors.accent, text: colors.onAccent, border: colors.accent },
    soft: { background: colors.accentSoft, text: colors.accentInk, border: colors.accentSoft },
    outline: { background: 'transparent', text: colors.text, border: colors.border },
  };
  const { background, text, border } = palette[tone];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={selected === undefined ? (loading ? { busy: true } : undefined) : { selected, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor: border, opacity: pressed || isDisabled ? 0.75 : 1 },
        style,
      ]}>
      <View style={styles.buttonContent}>
        {loading && <ActivityIndicator color={text} size="small" />}
        <Text numberOfLines={1} style={[styles.buttonLabel, { color: text }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Pill bật/tắt: chọn rồi thì đảo nền, chưa chọn thì viền mảnh.
 *
 * `floating` là biến thể dùng khi chip nằm **trên bản đồ**: nền trong suốt sẽ
 * lẫn vào đường và ô nhà, nên chip nổi phải có nền đặc và đổ bóng.
 */
export function Chip({
  label,
  selected = false,
  onPress,
  count,
  floating = false,
  trailing,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  count?: number;
  floating?: boolean;
  trailing?: string;
}) {
  const { colors } = useNookaTheme();
  const interactive = Boolean(onPress);
  const background = selected
    ? colors.inverseSurface
    : floating
      ? colors.surface
      : interactive
        ? 'transparent'
        : colors.surfaceMuted;
  const border = selected ? background : floating ? colors.borderSubtle : interactive ? colors.border : background;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={interactive ? 'button' : 'text'}
      accessibilityState={{ selected }}
      disabled={!interactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        floating && !selected ? [styles.floatingChip, { shadowColor: colors.shadow }] : null,
        { backgroundColor: background, borderColor: border, opacity: pressed ? 0.75 : 1 },
      ]}>
      <Text style={[styles.chipLabel, { color: selected ? colors.onInverse : colors.text }]}>{label}</Text>
      {count === undefined ? null : (
        <Text style={[styles.chipCount, { color: selected ? colors.onInverse : colors.accentInk }]}>{String(count)}</Text>
      )}
      {trailing === undefined ? null : (
        <Text style={[styles.chipCount, { color: selected ? colors.accent : colors.textSubtle }]}>{trailing}</Text>
      )}
    </Pressable>
  );
}

/**
 * Hàng kết quả dùng chung cho danh sách trong tab Tìm và kết quả của Hỏi Nooka.
 *
 * §5 của spec: **một loại card duy nhất** cho cả hai chế độ. Hai bề mặt trông
 * khác nhau sẽ làm người dùng thấy như đang dùng hai app, nên hai chỗ đó phải
 * gọi đúng component này chứ không tự dựng lại hàng riêng.
 */
export function ResultRow({
  tint,
  title,
  reason,
  tags,
  distance,
  badge,
  rank,
  onPress,
}: {
  tint: PhotoTint;
  title: string;
  reason: string;
  tags: string;
  distance: string;
  badge?: string;
  rank?: number;
  onPress?: () => void;
}) {
  const { colors } = useNookaTheme();

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.resultRow, { opacity: pressed ? 0.7 : 1 }]}>
      <View>
        <Photo style={styles.resultPhoto} tint={tint} />
        {rank === undefined ? null : (
          <View
            style={[
              styles.resultRank,
              { backgroundColor: rank === 1 ? colors.accent : colors.surfaceMuted },
            ]}>
            <Text style={[styles.resultRankText, { color: colors.text }]}>{String(rank)}</Text>
          </View>
        )}
        {badge === undefined ? null : (
          <View style={[styles.resultBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.resultBadgeText, { color: colors.onAccent }]}>{badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.resultCopy}>
        <View style={styles.resultTitleRow}>
          <Text numberOfLines={1} style={[styles.resultName, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.resultDistance, { color: colors.textMuted }]}>{distance}</Text>
        </View>
        <Text numberOfLines={2} style={[styles.resultReason, { color: colors.textMuted }]}>{reason}</Text>
        <Text numberOfLines={1} style={[styles.resultTags, { color: colors.accentInk }]}>{tags}</Text>
      </View>
    </Pressable>
  );
}

export function CircleButton({
  icon,
  accessibilityLabel,
  onPress,
  size = 38,
  tone = 'surface',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress?: () => void;
  size?: number;
  tone?: 'surface' | 'muted';
}) {
  const { colors } = useNookaTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.circleButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone === 'muted' ? colors.surfaceMuted : colors.surface,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      <Ionicons color={colors.text} name={icon} size={Math.round(size * 0.5)} />
    </Pressable>
  );
}

/** Hàng địa điểm dùng chung ở Bản đồ, Đã lưu, Cá nhân và màn chọn pin. */
export function SpotRow({
  tint,
  title,
  line,
  onPress,
  square = 48,
  radius = 14,
  trailing,
}: {
  tint: PhotoTint;
  title: string;
  line: string;
  onPress?: () => void;
  square?: number;
  radius?: number;
  trailing?: ReactNode;
}) {
  const { colors } = useNookaTheme();

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.spotRow, { opacity: pressed ? 0.7 : 1 }]}>
      <Photo style={{ width: square, height: square, borderRadius: radius }} tint={tint} />
      <View style={styles.spotRowCopy}>
        <Text numberOfLines={1} style={[styles.spotRowTitle, { color: colors.text }]}>{title}</Text>
        <Text numberOfLines={1} style={[styles.spotRowLine, { color: colors.textMuted }]}>{line}</Text>
      </View>
      {trailing ?? <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  fill: { flex: 1 },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  toastText: { fontSize: 13, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
  askBar: {
    marginTop: 11,
    marginHorizontal: 20,
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  askDot: { width: 13, height: 13, borderRadius: 7, borderWidth: 2 },
  askText: { flex: 1, fontSize: 13.5, lineHeight: 18, fontWeight: '600' },
  askHint: { fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  sectionLabel: { fontSize: 11, lineHeight: 15, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase' },
  button: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonLabel: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  chip: {
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipLabel: { fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  chipCount: { fontSize: 12.5, lineHeight: 17, fontWeight: '700' },
  floatingChip: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 9 },
  resultPhoto: { width: 60, height: 60, borderRadius: 16 },
  resultRank: {
    position: 'absolute',
    left: -7,
    top: -7,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultRankText: { fontSize: 13, lineHeight: 18, fontWeight: '800' },
  resultBadge: { position: 'absolute', left: -4, top: -4, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  resultBadgeText: { fontSize: 9.5, lineHeight: 13, fontWeight: '700', letterSpacing: 0.3 },
  resultCopy: { flex: 1, minWidth: 0, gap: 3 },
  resultTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  resultName: { flex: 1, fontSize: 15.5, lineHeight: 21, fontWeight: '700', letterSpacing: -0.4 },
  resultDistance: { fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
  resultReason: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  resultTags: { fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  circleButton: { alignItems: 'center', justifyContent: 'center' },
  spotRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  spotRowCopy: { flex: 1, minWidth: 0, gap: 3 },
  spotRowTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  spotRowLine: { fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
});
