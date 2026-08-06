import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NookaMap } from '@/components/nooka/nooka-map';
import { CircleButton, ScreenShell, SectionLabel } from '@/components/nooka/ui';
import { SPOT_IDS } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

type PrivacySetting = 'public' | 'friends' | 'private';

export default function ShareMapScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const { flash } = useNookaDemo();

  const [privacy, setPrivacy] = useState<PrivacySetting>('public');

  const privacyOptions: { id: PrivacySetting; titleKey: string; descKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    {
      id: 'public',
      titleKey: 'shareMap.privacyPublic',
      descKey: 'shareMap.privacyPublicDesc',
      icon: 'globe-outline',
    },
    {
      id: 'friends',
      titleKey: 'shareMap.privacyFriends',
      descKey: 'shareMap.privacyFriendsDesc',
      icon: 'people-outline',
    },
    {
      id: 'private',
      titleKey: 'shareMap.privacyPrivate',
      descKey: 'shareMap.privacyPrivateDesc',
      icon: 'lock-closed-outline',
    },
  ];

  return (
    <ScreenShell testID="share-map-screen">
      {/* Header Bar */}
      <View style={styles.header}>
        <CircleButton accessibilityLabel={t('common.close')} icon="close" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('shareMap.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Mini Map Preview Card */}
        <View style={[styles.mapCard, { borderColor: colors.borderSubtle, backgroundColor: colors.surfaceMuted }]}>
          <NookaMap spots={SPOT_IDS} style={styles.miniMap} />

          <View style={[styles.mapHeaderPill, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <View style={[styles.dotBadge, { backgroundColor: colors.accentStrong }]} />
            <Text style={[styles.mapTitleText, { color: colors.text }]}>{t('shareMap.mapCardTitle')}</Text>
          </View>

          <View style={[styles.mapFooterPill, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.mapSubtitleText, { color: colors.textMuted }]}>
              {t('shareMap.mapCardSubtitle', { places: 34, districts: 3 })}
            </Text>
          </View>
        </View>

        {/* Privacy Control Section */}
        <View style={styles.section}>
          <SectionLabel>{t('shareMap.privacySection')}</SectionLabel>
          <View style={styles.optionsGroup}>
            {privacyOptions.map((opt) => {
              const selected = privacy === opt.id;
              return (
                <Pressable
                  accessibilityLabel={t(opt.titleKey)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={opt.id}
                  onPress={() => setPrivacy(opt.id)}
                  style={({ pressed }) => [
                    styles.privacyRow,
                    {
                      backgroundColor: selected ? colors.accentSoft : colors.surface,
                      borderColor: selected ? colors.accentStrong : colors.borderSubtle,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}>
                  <View style={[styles.iconCircle, { backgroundColor: selected ? colors.surface : colors.surfaceMuted }]}>
                    <Ionicons color={selected ? colors.accentStrong : colors.icon} name={opt.icon} size={18} />
                  </View>
                  <View style={styles.privacyCopy}>
                    <Text style={[styles.privacyTitle, { color: colors.text }]}>{t(opt.titleKey)}</Text>
                    <Text style={[styles.privacyDesc, { color: colors.textMuted }]}>{t(opt.descKey)}</Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      { borderColor: selected ? colors.accentStrong : colors.border, backgroundColor: colors.surface },
                    ]}>
                    {selected && <View style={[styles.radioDot, { backgroundColor: colors.accentStrong }]} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Share Action Grid */}
        <View style={styles.actionsGrid}>
          <Pressable
            accessibilityLabel={t('shareMap.copyLink')}
            accessibilityRole="button"
            onPress={() => flash(t('shareMap.linkCopiedToast'))}
            style={({ pressed }) => [
              styles.actionTile,
              { backgroundColor: colors.inverseSurface, opacity: pressed ? 0.8 : 1 },
            ]}>
            <Ionicons color={colors.onInverse} name="link-outline" size={20} />
            <Text style={[styles.primaryActionText, { color: colors.onInverse }]}>{t('shareMap.copyLink')}</Text>
          </Pressable>

          <Pressable
            accessibilityLabel={t('shareMap.sendInMessages')}
            accessibilityRole="button"
            onPress={() => flash(t('shareMap.sendInMessages'))}
            style={({ pressed }) => [
              styles.actionTile,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.borderSubtle, opacity: pressed ? 0.8 : 1 },
            ]}>
            <Ionicons color={colors.text} name="paper-plane-outline" size={20} />
            <Text style={[styles.actionTileText, { color: colors.text }]}>{t('shareMap.sendInMessages')}</Text>
          </Pressable>

          <Pressable
            accessibilityLabel={t('shareMap.savePoster')}
            accessibilityRole="button"
            onPress={() => flash(t('shareMap.posterSavedToast'))}
            style={({ pressed }) => [
              styles.actionTile,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.borderSubtle, opacity: pressed ? 0.8 : 1 },
            ]}>
            <Ionicons color={colors.text} name="download-outline" size={20} />
            <Text style={[styles.actionTileText, { color: colors.text }]}>{t('shareMap.savePoster')}</Text>
          </Pressable>

          <Pressable
            accessibilityLabel={t('shareMap.moreOptions')}
            accessibilityRole="button"
            onPress={() => flash(t('shareMap.moreOptions'))}
            style={({ pressed }) => [
              styles.actionTile,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.borderSubtle, opacity: pressed ? 0.8 : 1 },
            ]}>
            <Ionicons color={colors.text} name="ellipsis-horizontal-circle-outline" size={20} />
            <Text style={[styles.actionTileText, { color: colors.text }]}>{t('shareMap.moreOptions')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  headerTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 38,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 22,
  },
  mapCard: {
    height: 195,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  miniMap: {
    width: '100%',
    height: '100%',
  },
  mapHeaderPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dotBadge: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  mapTitleText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  mapFooterPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  mapSubtitleText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
  },
  section: {
    gap: 10,
  },
  optionsGroup: {
    gap: 8,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  privacyTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  privacyDesc: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionsGrid: {
    gap: 10,
  },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 16,
  },
  primaryActionText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  actionTileText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
});
