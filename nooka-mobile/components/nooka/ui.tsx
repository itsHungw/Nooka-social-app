import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, type ImageSource } from 'expo-image';
import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

type ScreenShellProps = PropsWithChildren<{
  scroll?: boolean;
  contentContainerStyle?: ViewStyle;
  testID?: string;
}>;

export function ScreenShell({ children, scroll = true, contentContainerStyle, testID }: ScreenShellProps) {
  const { colors } = useNookaTheme();
  const content = <View style={[styles.page, contentContainerStyle]}>{children}</View>;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]} testID={testID}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress?: () => void;
  filled?: boolean;
  size?: number;
};

export function IconButton({ icon, accessibilityLabel, onPress, filled = false, size = 38 }: IconButtonProps) {
  const { colors } = useNookaTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: size,
          height: size,
          borderColor: colors.border,
          backgroundColor: filled ? colors.accent : colors.surface,
          opacity: pressed ? 0.72 : 1,
        },
      ]}>
      <Ionicons color={filled ? colors.onAccent : colors.text} name={icon} size={20} />
    </Pressable>
  );
}

type PillProps = {
  label: string;
  selected?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  tone?: 'default' | 'mint' | 'accent';
};

export function Pill({ label, selected = false, icon, onPress, tone = 'default' }: PillProps) {
  const { colors } = useNookaTheme();
  const backgroundColor = selected || tone === 'accent' ? colors.accent : tone === 'mint' ? colors.mint : colors.surface;
  const borderColor = selected || tone === 'accent' ? colors.accent : tone === 'mint' ? colors.mintStrong : colors.border;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor, borderColor, opacity: pressed ? 0.72 : 1 },
      ]}>
      {icon ? <Ionicons color={selected ? colors.onAccent : colors.icon} name={icon} size={15} /> : null}
      <Text style={[styles.pillText, { color: selected ? colors.onAccent : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function AvatarStack({ count = 3, size = 28 }: { count?: number; size?: number }) {
  const { colors } = useNookaTheme();
  const initials = ['L', 'N', 'A'];
  const fills = [colors.accentSoft, colors.mint, colors.surfaceMuted];

  return (
    <View accessibilityElementsHidden style={styles.avatarStack}>
      {initials.slice(0, count).map((initial, index) => (
        <View
          key={initial}
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: index === 0 ? 0 : -(size * 0.28),
              backgroundColor: fills[index],
              borderColor: colors.surface,
            },
          ]}>
          <Text style={[styles.avatarText, { color: colors.text }]}>{initial}</Text>
        </View>
      ))}
    </View>
  );
}

type PlaceRowProps = {
  image: ImageSource;
  nameKey: string;
  metaKey: string;
  socialKey: string;
  friendCount?: number;
  saved?: boolean;
  onSave?: () => void;
  trailing?: ReactNode;
};

export function PlaceRow({ image, nameKey, metaKey, socialKey, friendCount, saved, onSave, trailing }: PlaceRowProps) {
  const { colors } = useNookaTheme();

  return (
    <View style={[styles.placeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Image
        accessibilityLabel={t(nameKey)}
        contentFit="cover"
        source={image}
        style={[styles.placeImage, { backgroundColor: colors.imageFallback }]}
        transition={180}
      />
      <View style={styles.placeCopy}>
        <Text numberOfLines={1} style={[styles.placeTitle, { color: colors.text }]}>{t(nameKey)}</Text>
        <Text numberOfLines={1} style={[styles.placeMeta, { color: colors.textMuted }]}>{t(metaKey)}</Text>
        <Text numberOfLines={1} style={[styles.placeSocial, { color: colors.textMuted }]}>{t(socialKey)}</Text>
        {friendCount ? (
          <View style={styles.friendLine}>
            <AvatarStack count={Math.min(friendCount, 3)} size={22} />
            <Text style={[styles.friendText, { color: colors.textMuted }]}>
              {t('search.friendBeen', { count: friendCount })}
            </Text>
          </View>
        ) : null}
      </View>
      {trailing ?? (
        <Pressable accessibilityLabel={t('navigation.saved')} accessibilityRole="button" hitSlop={10} onPress={onSave}>
          <Ionicons color={saved ? colors.accent : colors.icon} name={saved ? 'bookmark' : 'bookmark-outline'} size={22} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 18, paddingBottom: 28 },
  iconButton: { borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pill: { minHeight: 38, borderRadius: 19, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pillText: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatar: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 10, fontWeight: '700' },
  placeRow: { minHeight: 116, borderRadius: 8, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  placeImage: { width: 102, height: 96, borderRadius: 8 },
  placeCopy: { flex: 1, minWidth: 0, gap: 4 },
  placeTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  placeMeta: { fontSize: 11, lineHeight: 16 },
  placeSocial: { fontSize: 11, lineHeight: 16 },
  friendLine: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 7 },
  friendText: { fontSize: 10, lineHeight: 14 },
});
