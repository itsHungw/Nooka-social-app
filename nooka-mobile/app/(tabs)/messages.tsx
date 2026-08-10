import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip, Photo, ScreenShell, SectionLabel } from '@/components/nooka/ui';
import { spotName } from '@/features/nooka/labels';
import { FRIENDS, type FriendId, type PhotoTint, type SpotId } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

type FilterType = 'all' | 'invites' | 'posts';

type ConvItem = {
  id: FriendId | 'mai';
  nameKey?: string;
  nameRaw?: string;
  timeKey: string;
  subtextKey?: string;
  subtextRaw?: string;
  spotId?: SpotId;
  isInvite?: boolean;
  tint: PhotoTint;
};

const CONVERSATIONS: ConvItem[] = [
  {
    id: 'linh',
    timeKey: 'time.twoHours',
    subtextKey: 'chat.linhMsg1',
    spotId: 'workshop',
    tint: 'photoWarm',
  },
  {
    id: 'nam',
    timeKey: 'time.yesterday',
    subtextRaw: 'Friday 7pm, before the rooftop fills up?',
    spotId: 'bloom',
    isInvite: true,
    tint: 'photoSand',
  },
  {
    id: 'trang',
    timeKey: 'time.twoDaysAgo',
    subtextRaw: 'Is Muoi 43 still open late on Sunday?',
    spotId: 'muoi43',
    tint: 'photoSage',
  },
  {
    id: 'huy',
    timeKey: 'time.threeDaysAgo',
    subtextRaw: 'Thanks for the tip — went this morning',
    tint: 'photoWarm',
  },
];

const REQUESTS: ConvItem[] = [
  {
    id: 'mai',
    nameRaw: 'Mai',
    timeKey: 'time.yesterday',
    subtextKey: 'messages.requestsSubtext',
    tint: 'photoSand',
  },
];

export default function MessagesScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const { flash } = useNookaDemo();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [query, setQuery] = useState('');

  const openChat = (id: string) => {
    router.push({ pathname: '/chat/[id]', params: { id } });
  };

  return (
    <ScreenShell testID="messages-screen">
      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('messages.title')}</Text>
        <Pressable
          accessibilityLabel={t('messages.title')}
          accessibilityRole="button"
          onPress={() => flash(t('messages.title'))}
          style={({ pressed }) => [styles.composeBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons color={colors.text} name="create-outline" size={22} />
        </Pressable>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Ionicons color={colors.icon} name="search-outline" size={18} />
          <TextInput
            onChangeText={setQuery}
            placeholder={t('messages.searchPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
          />
          {query.length > 0 && (
            <Pressable accessibilityLabel={t('common.close')} accessibilityRole="button" onPress={() => setQuery('')}>
              <Ionicons color={colors.textMuted} name="close-circle" size={16} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <Chip
            label={t('messages.filterAll')}
            onPress={() => setActiveFilter('all')}
            selected={activeFilter === 'all'}
          />
          <Chip
            count={2}
            label={t('messages.filterInvites')}
            onPress={() => setActiveFilter('invites')}
            selected={activeFilter === 'invites'}
          />
          <Chip
            label={t('messages.filterPosts')}
            onPress={() => setActiveFilter('posts')}
            selected={activeFilter === 'posts'}
          />
        </View>

        {/* Nooka Assistant Callout Card */}
        <Pressable
          accessibilityLabel={t('messages.assistantTitle')}
          accessibilityRole="button"
          onPress={() => router.push('/ask')}
          style={({ pressed }) => [
            styles.assistantCard,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.borderSubtle, opacity: pressed ? 0.85 : 1 },
          ]}>
          <Image source={require('@/assets/images/nooka-avatar.png')} style={styles.assistantAvatar} />
          <View style={styles.assistantCopy}>
            <View style={styles.assistantHeaderRow}>
              <Text style={[styles.assistantTitle, { color: colors.text }]}>{t('messages.assistantTitle')}</Text>
              <Text style={[styles.nowBadge, { color: colors.textSubtle }]}>{t('time.now')}</Text>
            </View>
            <Text numberOfLines={2} style={[styles.assistantDesc, { color: colors.textMuted }]}>
              {t('messages.assistantDesc')}
            </Text>
          </View>
        </Pressable>

        {/* Conversations List */}
        <View style={styles.convList}>
          {CONVERSATIONS.map((conv) => {
            const friendObj = FRIENDS.find((f) => f.id === conv.id);
            const name = conv.nameRaw ?? (friendObj ? t(`friends.${friendObj.id as FriendId}`) : conv.id);
            const subtext = conv.subtextKey ? t(conv.subtextKey) : (conv.subtextRaw ?? '');
            const time = t(conv.timeKey);
            const spot = conv.spotId ? spotName(conv.spotId) : null;

            return (
              <Pressable
                accessibilityLabel={name}
                accessibilityRole="button"
                key={conv.id}
                onPress={() => openChat(conv.id)}
                style={({ pressed }) => [styles.convRow, { opacity: pressed ? 0.75 : 1 }]}>
                <Photo style={styles.convAvatar} tint={conv.tint} />

                <View style={styles.convContent}>
                  <View style={styles.convTopRow}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.convName, { color: colors.text }]}>{name}</Text>
                      {conv.isInvite && (
                        <View style={[styles.inviteTag, { backgroundColor: colors.accent }]}>
                          <Text style={[styles.inviteTagText, { color: colors.onAccent }]}>
                            {t('messages.inviteBadge')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.convTime, { color: conv.isInvite ? colors.accentInk : colors.textMuted }]}>
                      {time}
                    </Text>
                  </View>

                  <Text numberOfLines={1} style={[styles.convSubtext, { color: colors.textMuted }]}>
                    {subtext}
                  </Text>

                  {spot && (
                    <View style={styles.spotBadgeRow}>
                      <View style={[styles.spotDot, { backgroundColor: colors.accentStrong }]} />
                      <Text style={[styles.spotBadgeText, { color: colors.textSubtle }]}>{spot}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Message Requests Section */}
        <View style={styles.section}>
          <SectionLabel>{t('messages.requestsHeader', { count: 2 })}</SectionLabel>
          <View style={styles.convList}>
            {REQUESTS.map((req) => (
              <Pressable
                accessibilityLabel={req.nameRaw ?? 'Mai'}
                accessibilityRole="button"
                key={req.id}
                onPress={() => openChat(req.id)}
                style={({ pressed }) => [styles.convRow, { opacity: pressed ? 0.75 : 1 }]}>
                <Photo style={styles.convAvatar} tint={req.tint} />
                <View style={styles.convContent}>
                  <View style={styles.convTopRow}>
                    <Text style={[styles.convName, { color: colors.text }]}>{req.nameRaw ?? 'Mai'}</Text>
                    <Text style={[styles.convTime, { color: colors.textMuted }]}>{t(req.timeKey)}</Text>
                  </View>
                  <Text numberOfLines={1} style={[styles.convSubtext, { color: colors.textMuted }]}>
                    {t('messages.requestsSubtext')}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Privacy Footnote */}
        <Text style={[styles.footnote, { color: colors.textSubtle }]}>{t('messages.privacyFootnote')}</Text>
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
    paddingTop: 6,
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  composeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchBox: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 36,
    gap: 18,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assistantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  assistantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  assistantCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  assistantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assistantTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  nowBadge: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  assistantDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
  },
  convList: {
    gap: 12,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    paddingVertical: 4,
  },
  convAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  convContent: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  convTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  convName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  inviteTag: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inviteTagText: {
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  convTime: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  convSubtext: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  spotBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  spotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  spotBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  section: {
    gap: 10,
    marginTop: 6,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 4,
  },
});
