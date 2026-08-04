import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AvatarStack, IconButton, Pill, ScreenShell } from '@/components/nooka/ui';
import { homePost, workshopImage } from '@/features/nooka/prototype-data';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

type Intent = 'want' | 'been' | null;

export default function HomeScreen() {
  const { colors } = useNookaTheme();
  const [liked, setLiked] = useState(false);
  const [intent, setIntent] = useState<Intent>('want');

  return (
    <ScreenShell testID="home-screen">
      <View style={styles.header}>
        <Text style={[styles.brand, { color: colors.text }]}>{t('brand.name')}</Text>
        <View style={styles.headerActions}>
          <View style={[styles.locationPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons color={colors.mintStrong} name="location" size={16} />
            <Text style={[styles.locationText, { color: colors.text }]}>{t('home.location')}</Text>
          </View>
          <IconButton accessibilityLabel={t('navigation.home')} icon="notifications-outline" />
        </View>
      </View>

      <View style={styles.authorRow}>
        <View style={[styles.authorAvatar, { backgroundColor: colors.mint, borderColor: colors.surface }]}>
          <Text style={[styles.authorInitials, { color: colors.text }]}>{homePost.authorInitials}</Text>
        </View>
        <View style={styles.authorCopy}>
          <Text style={[styles.authorName, { color: colors.text }]}>{t(homePost.authorNameKey)}</Text>
          <Text style={[styles.postedAt, { color: colors.textMuted }]}>{t(homePost.postedAtKey)}</Text>
        </View>
      </View>

      <View style={[styles.hero, { backgroundColor: colors.imageFallback }]}>
        <Image
          accessibilityLabel={t('home.workshopName')}
          contentFit="cover"
          source={workshopImage}
          style={StyleSheet.absoluteFill}
          transition={180}
        />
        <View style={styles.captionAnchor}>
          <View style={[styles.captionBubble, { backgroundColor: colors.captionSurface }]}>
            <Text numberOfLines={2} style={[styles.captionText, { color: colors.captionText }]}>{t(homePost.captionKey)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pill icon={liked ? 'heart' : 'heart-outline'} label={t('home.like')} onPress={() => setLiked((value) => !value)} selected={liked} />
        <Pill icon="bookmark" label={t('home.wantToGo')} onPress={() => setIntent(intent === 'want' ? null : 'want')} selected={intent === 'want'} />
        <Pill icon="chatbubble-ellipses-outline" label={t('home.ask')} />
        <Pill icon="checkmark-circle-outline" label={t('home.been')} onPress={() => setIntent(intent === 'been' ? null : 'been')} selected={intent === 'been'} />
      </View>

      <View style={[styles.placeCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, shadowColor: colors.shadow }]}>
        <View style={[styles.sparkle, { backgroundColor: colors.accent }]}>
          <Ionicons color={colors.onAccent} name="sparkles" size={21} />
        </View>
        <View style={styles.placeCardCopy}>
          <Text numberOfLines={1} style={[styles.placeTitle, { color: colors.text }]}>{t(homePost.placeNameKey)}</Text>
          <View style={styles.locationRow}>
            <Ionicons color={colors.mintStrong} name="location-outline" size={14} />
            <Text style={[styles.locationDetail, { color: colors.textMuted }]}>{t(homePost.locationKey)}</Text>
          </View>
          <View style={styles.categories}>
            {homePost.categoryKeys.map((categoryKey) => (
              <View key={categoryKey} style={[styles.categoryChip, { backgroundColor: colors.mint, borderColor: colors.mintStrong }]}>
                <Text style={[styles.categoryText, { color: colors.text }]}>{t(categoryKey)}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.hashtags, { color: colors.mintStrong }]}>{t(homePost.hashtagsKey)}</Text>
        </View>
      </View>

      <View style={[styles.friendsRow, { borderColor: colors.border }]}>
        <Text style={[styles.friendsText, { color: colors.text }]}>{t('home.friendsVisited')}</Text>
        <AvatarStack size={28} />
        <Ionicons color={colors.icon} name="chevron-forward" size={20} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { fontSize: 30, lineHeight: 36, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationPill: { minHeight: 38, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  authorRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  authorInitials: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
  authorCopy: { gap: 1 },
  authorName: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  postedAt: { fontSize: 10, lineHeight: 14 },
  hero: { height: 360, borderRadius: 18, overflow: 'hidden' },
  captionAnchor: { position: 'absolute', left: 12, right: 12, bottom: 14, alignItems: 'center' },
  captionBubble: { maxWidth: '88%', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  captionText: { textAlign: 'center', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  placeCard: { marginTop: 14, minHeight: 142, borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  sparkle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  placeCardCopy: { flex: 1, minWidth: 0 },
  placeTitle: { fontSize: 18, lineHeight: 23, fontWeight: '800' },
  locationRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationDetail: { flex: 1, fontSize: 11, lineHeight: 16 },
  categories: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryChip: { minHeight: 28, borderRadius: 14, borderWidth: 1, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  categoryText: { fontSize: 10, lineHeight: 14, fontWeight: '600' },
  hashtags: { marginTop: 9, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  actionsRow: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  friendsRow: { minHeight: 66, marginTop: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  friendsText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '500' },
});
