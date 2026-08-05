import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Photo, SectionLabel } from '@/components/nooka/ui';
import { formatDistance, spotDistrict, spotName, tagLabel } from '@/features/nooka/labels';
import {
  FRIENDS,
  INITIAL_FEED,
  SPOTS,
  SPOT_IDS,
  type FriendId,
  type SpotId,
} from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

/**
 * Universal search (§6.1) — người dùng đã biết mình tìm gì.
 *
 * Không tự chuyển sang AI khi câu hỏi dài: §6.2 nói rõ chỉ **gợi ý**, vì người
 * dùng có thể chỉ đang tìm một bài đăng có chứa câu đó. Thẻ gợi ý nằm trên,
 * kết quả search thường vẫn hiển thị bên dưới.
 */

const TABS = ['top', 'places', 'people', 'posts', 'topics'] as const;
type TabId = (typeof TABS)[number];

/** Câu càng dài, càng có khả năng là một nhu cầu chứ không phải một cái tên. */
const NUDGE_MIN_WORDS = 3;

export function SearchOverlay({
  onClose,
  onPickSpot,
}: {
  onClose: () => void;
  onPickSpot: (id: SpotId) => void;
}) {
  const { colors } = useNookaTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<TabId>('top');

  const needle = query.trim().toLowerCase();
  const showNudge = needle.split(/\s+/).filter(Boolean).length >= NUDGE_MIN_WORDS;

  const places = useMemo(() => {
    if (!needle) return SPOT_IDS.slice(0, 3);
    return SPOT_IDS.filter((id) => {
      const haystack = [
        spotName(id),
        spotDistrict(id),
        ...SPOTS[id].tags.map((tag) => tagLabel(tag.id)),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [needle]);

  const people = useMemo(() => {
    if (!needle) return FRIENDS.slice(0, 2);
    return FRIENDS.filter((friend) => t(`friends.${friend.id}`).toLowerCase().includes(needle));
  }, [needle]);

  const posts = useMemo(() => {
    const withCaption = INITIAL_FEED.filter((post) => post.captionKey && post.friend);
    if (!needle) return withCaption.slice(0, 2);
    return withCaption.filter((post) => t(post.captionKey ?? '').toLowerCase().includes(needle));
  }, [needle]);

  const showPlaces = tab === 'top' || tab === 'places';
  const showPeople = tab === 'top' || tab === 'people';
  const showPosts = tab === 'top' || tab === 'posts';
  const empty = !places.length && !people.length && !posts.length;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.headRow}>
        <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.accentStrong }]}>
          <Ionicons color={colors.text} name="search" size={17} />
          <TextInput
            accessibilityLabel={t('search.universalPlaceholder')}
            autoFocus
            onChangeText={setQuery}
            placeholder={t('search.universalPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            returnKeyType="search"
            style={[styles.input, { color: colors.text }]}
            value={query}
          />
          {query.length ? (
            <Pressable
              accessibilityLabel={t('common.cancel')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setQuery('')}
              style={[styles.clear, { backgroundColor: colors.surfaceMuted }]}>
              <Ionicons color={colors.textMuted} name="close" size={15} />
            </Pressable>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose}>
          <Text style={[styles.cancel, { color: colors.text }]}>{t('common.cancel')}</Text>
        </Pressable>
      </View>

      {showNudge ? (
        <View style={[styles.nudge, { backgroundColor: colors.accentSoft }]}>
          <View style={[styles.nudgeRing, { borderColor: colors.accentStrong }]} />
          <Text style={[styles.nudgeText, { color: colors.accentInk }]}>{t('search.nudge')}</Text>
          <Pressable
            accessibilityLabel={t('search.askShort')}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              router.push('/ask');
            }}
            style={({ pressed }) => [
              styles.nudgeCta,
              { backgroundColor: pressed ? colors.inverseSurfacePressed : colors.inverseSurface },
            ]}>
            <Text style={[styles.nudgeCtaText, { color: colors.onInverse }]}>{t('search.askShort')}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.tabs, { borderColor: colors.borderSubtle }]}>
        {TABS.map((id) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === id }}
            key={id}
            onPress={() => setTab(id)}
            style={styles.tab}>
            <Text
              style={[
                styles.tabLabel,
                { color: tab === id ? colors.text : colors.textMuted, fontWeight: tab === id ? '700' : '600' },
              ]}>
              {t(`search.tabs.${id}`)}
            </Text>
            <View
              style={[
                styles.tabUnderline,
                { backgroundColor: tab === id ? colors.accentStrong : 'transparent' },
              ]}
            />
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.results}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {empty ? <Text style={[styles.empty, { color: colors.textMuted }]}>{t('search.empty')}</Text> : null}

        {showPlaces && places.length ? (
          <>
            <SectionLabel>{t('search.sections.places')}</SectionLabel>
            {places.map((id) => (
              <CompactRow
                key={id}
                onPress={() => onPickSpot(id)}
                subtitle={`${spotDistrict(id)} · ${formatDistance(SPOTS[id].distanceM)} · ${t('spot.checkins', { count: SPOTS[id].checkins })}`}
                tint={SPOTS[id].photoTint}
                title={spotName(id)}
              />
            ))}
          </>
        ) : null}

        {showPeople && people.length ? (
          <>
            <SectionLabel>{t('search.sections.people')}</SectionLabel>
            {people.map((friend) => (
              <CompactRow
                key={friend.id}
                round
                subtitle={t('search.personMeta', { handle: friend.id, count: 3 })}
                tint="avatarDefault"
                title={t(`friends.${friend.id}` as const)}
              />
            ))}
          </>
        ) : null}

        {showPosts && posts.length ? (
          <>
            <SectionLabel>{t('search.sections.posts')}</SectionLabel>
            {posts.map((post) => (
              <CompactRow
                key={post.id}
                onPress={() => onPickSpot(post.spot)}
                subtitle={t('search.postMeta', {
                  who: t(`friends.${post.friend as FriendId}`),
                  spot: spotName(post.spot),
                  time: t(post.timeKey),
                })}
                tint={SPOTS[post.spot].photoTint}
                title={t(post.captionKey ?? '')}
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function CompactRow({
  tint,
  title,
  subtitle,
  onPress,
  round = false,
}: {
  tint: Parameters<typeof Photo>[0]['tint'];
  title: string;
  subtitle: string;
  onPress?: () => void;
  round?: boolean;
}) {
  const { colors } = useNookaTheme();

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <Photo style={[styles.rowThumb, round ? styles.rowThumbRound : null]} tint={tint} />
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        <Text numberOfLines={1} style={[styles.rowSub, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  field: {
    flex: 1,
    minHeight: 52,
    borderRadius: 17,
    borderWidth: 1.6,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '600', padding: 0 },
  clear: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancel: { fontSize: 14.5, lineHeight: 19, fontWeight: '700', letterSpacing: -0.2 },
  nudge: { marginTop: 12, marginHorizontal: 16, borderRadius: 18, padding: 16, gap: 12 },
  nudgeRing: { position: 'absolute', left: 16, top: 17, width: 15, height: 15, borderRadius: 8, borderWidth: 2.2 },
  nudgeText: { marginLeft: 24, fontSize: 13.5, lineHeight: 19, fontWeight: '600', letterSpacing: -0.2 },
  nudgeCta: { alignSelf: 'flex-end', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  nudgeCtaText: { fontSize: 12.5, lineHeight: 17, fontWeight: '700' },
  tabs: { marginTop: 16, paddingHorizontal: 16, flexDirection: 'row', gap: 20, borderBottomWidth: 1 },
  tab: { paddingBottom: 9, gap: 8 },
  tabLabel: { fontSize: 13.5, lineHeight: 18, letterSpacing: -0.2 },
  tabUnderline: { height: 2.5, borderRadius: 2 },
  results: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 4 },
  empty: { paddingTop: 12, fontSize: 14, lineHeight: 22, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 7 },
  rowThumb: { width: 42, height: 42, borderRadius: 13 },
  rowThumbRound: { borderRadius: 21 },
  rowCopy: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: { fontSize: 14.5, lineHeight: 20, fontWeight: '700', letterSpacing: -0.3 },
  rowSub: { fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
});
